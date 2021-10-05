

//
// h(A:0.5,B:0.5,v(C,D):0.3)
//

//
// { type:'node', orientation:'v', name:'x', weight:1, children: [] }
//

const MSEC_PER_FRAME = 64;

const NODE_ORIENTATION_HORIZONTAL=0
const NODE_ORIENTATION_VERTICAL=1

const SIDE_LEFT   = 0
const SIDE_TOP    = 1
const SIDE_RIGHT  = 2
const SIDE_BOTTOM = 3

const CLOSEST_SIDE_SIDE = 0;
const CLOSEST_SIDE_DIST = 1;

function Rect(x,y,w,h) {
	this.x = x
	this.y = y
	this.w = w
	this.h = h
	this.contains = function(x,y) {
		return (!(x < this.x || x > this.x + this.w || y < this.y || y > this.y + this.h))
	}
	this.distances = function(x,y) {
		// -------
		// [left.top,right,bottom] format
		// -------
		let dist_left 	= x - this.x;
		let dist_top 	= y - this.y;
		let dist_right  = this.x + this.w - x;
		let dist_bottom = this.y + this.h - y;

		return [dist_left, dist_top, dist_right, dist_bottom]
	}
	this.closest_side_to_position = function(x,y) {
		let dists= this.distances(x,y)
		let min_dist;
		let closest_side;

		for (let i=0; i <dists.length; i++) {
			let dist = dists[i];
			if (!min_dist || dist < min_dist) {
				min_dist = dist;
				closest_side = i;
			}
		}

		if (min_dist > 50) { return }

		return [closest_side, min_dist];
	}
	return this
}

function Node(name, weight, orientation) {
	this.name = name
	if (weight === undefined) weight = 1
	this.weight = weight
	if (orientation === undefined) orientation = NODE_ORIENTATION_VERTICAL
	this.orientation = orientation
	this.children = []
	this.depth = 0
	this.parent = undefined
	this.set_depth = function(depth) {
		this.depth = depth
		for (let c of this.children) {
			c.set_depth(this.depth+1)
		}
	}
	this.add_child = function(child_node) {
		child_node.parent = this
		this.children.push(child_node)
		child_node.set_depth(this.depth+1)
	}
	return this
}

function ResizeTarget(node, side, dist, x0, y0) {
	this.node = node
	this.side = side
	this.dist = dist
	this.mouse_x = x0
	this.mouse_y = y0

	return this
}

// margin

function map_align_nodes(node, rect, output)
{
	// clone rect
	output[node.name] = { node:node, rect:{ ...rect }}

	if (node.children.length > 0) {
		let sum = 0
		for (let child of node.children) {
			sum = sum + child.weight
		}
		if (node.orientation == NODE_ORIENTATION_HORIZONTAL) {
			let x = rect.x
			let y = rect.y
			for (let child of node.children) {
				let w = (child.weight / sum) * rect.w
				let h = rect.h
				map_align_nodes(child, new Rect(x, y, w, h), output)
				x = x + w
			}
		} else if (node.orientation == NODE_ORIENTATION_VERTICAL) {
			let x = rect.x
			let y = rect.y
			for (let child of node.children) {
				let w = rect.w
				let h = (child.weight / sum) * rect.h
				map_align_nodes(child, new Rect(x, y, w, h), output)
				y = y + h
			}
		}
	}
}

const KEY_LEFT=37
const KEY_UP=38
const KEY_RIGHT=39
const KEY_DOWN=40

var global = {
	layout_root: undefined,
	layout_dimensions: undefined,
	components: [],
	layout_modes: [],
	resize_target: undefined
}

function update()
{
	// area
	let area = new Rect(0,0, window.innerWidth, window.innerHeight)

	let dimensions = {}
	let layout_root = global.layout_modes[global.layout_index]
	map_align_nodes(layout_root, area, dimensions)

	global.layout_dimensions = dimensions

	for (let it of global.components) {
		let component = it.component
		let entry = dimensions[it.position]
		if (entry) {
			let rect = entry.rect
			component.style.resize='both'
			component.style.position='fixed'
			component.style.left=rect.x+"px"
			component.style.top=rect.y+"px"
			component.style.width=rect.w+"px"
			component.style.height=rect.h+"px"
			component.style.visibility="visible"
		} else {
			component.style.visibility="hidden"
		}
	}

	setTimeout(update, MSEC_PER_FRAME)
}


function main()
{
	{
		let c_0     = new Node('root', 1, NODE_ORIENTATION_HORIZONTAL)
		let c_l     = new Node('l', 1, NODE_ORIENTATION_VERTICAL)
		let c_l_t   = new Node('lt')
		let c_l_b   = new Node('table')
		let c_r     = new Node('r', 2, NODE_ORIENTATION_VERTICAL)
		let c_r_t   = new Node('scatterplot')
		let c_r_b   = new Node('rb', 1, NODE_ORIENTATION_HORIZONTAL)
		let c_r_b_l = new Node('cdf')
		let c_r_b_r = new Node('rbr')

		c_0.add_child(c_l)
		c_0.add_child(c_r)

		c_l.add_child(c_l_t)
		c_l.add_child(c_l_b)

		c_r.add_child(c_r_t)
		c_r.add_child(c_r_b)

		c_r_b.add_child(c_r_b_l)
		c_r_b.add_child(c_r_b_r)

		global.layout_modes.push(c_0)
	}

	{
		let c_0     = new Node('root', 1, NODE_ORIENTATION_HORIZONTAL)
		let c_l     = new Node('table')
		let c_r     = new Node('r',1, NODE_ORIENTATION_VERTICAL)
		let c_r_t   = new Node('scatterplot')
		let c_r_b   = new Node('cdf')

		c_0.add_child(c_l)
		c_0.add_child(c_r)

		c_r.add_child(c_r_t)
		c_r.add_child(c_r_b)

		global.layout_modes.push(c_0)
	}

	{
		let c_0     = new Node('root', 1, NODE_ORIENTATION_HORIZONTAL)
		let c_l     = new Node('table')
		let c_r     = new Node('scatterplot')

		c_0.add_child(c_l)
		c_0.add_child(c_r)

		global.layout_modes.push(c_0)
	}

	global.layout_index = 0

	let table = document.createElement('div');
	table.style='background-color:#ff0000;'

	let scatterplot = document.createElement('div');
	scatterplot.style='background-color:#00ff00;'

	let cdf = document.createElement('div');
	cdf.style='background-color:#0000ff;'

	global.components = [
		{ component: table, position: 'table' },
		{ component: scatterplot, position: 'scatterplot' },
		{ component: cdf, position: 'cdf' }
	]

	document.body.appendChild(table)
	document.body.appendChild(scatterplot)
	document.body.appendChild(cdf)

	window.addEventListener("keydown", function(e) {
		if (e.keyCode === KEY_UP) {
			global.layout_index = (global.layout_index + 1) % global.layout_modes.length
		} else if (e.keyCode === KEY_DOWN) {
			if (global.layout_index == 0)  global.layout_index = global.layout_modes.length
			global.layout_index = global.layout_index - 1
		}
	})


	//
	// lemma: the node that should update its weight to reflect a resize
	// should be a node that:
	//
	// (1) contains the mouse position
	// (2) from all nodes satisfying (1) the mouse pos smallest distance to one of its side is minimal
	// (3) from all nodes satisfying (1) and (2) it should be the one with smallest depth
	//

	window.addEventListener('mousedown', function(e) {
		// try to find cell where the mouse is hovering
		let x = e.clientX;
		let y = e.clientY;
		let best_candidate = undefined;
		let resize_target = undefined ;
		for (let k in global.layout_dimensions) {
			let entry = global.layout_dimensions[k]
			let rect = entry.rect
			if (rect.contains(x,y)) {
				let node = entry.node
				if (!best_candidate) {
					best_candidate = node
				} else if (best_candidate.depth < node.depth) {
					best_candidate = node
				}

				let closest_side = rect.closest_side_to_position(x,y)
				if (closest_side) {
					if ( (!resize_target) ||
						(closest_side[CLOSEST_SIDE_DIST] < resize_target.dist) ||
						(closest_side[CLOSEST_SIDE_DIST] == resize_target.dist && node.depth < resize_target.node.depth )) {
						resize_target = new ResizeTarget(node, closest_side[CLOSEST_SIDE_SIDE], closest_side[CLOSEST_SIDE_DIST], x, y)
					}
				}
			}
		}

		global.resize_target = resize_target

		//
		// now search node by name on the active cell structure
		//
		if (best_candidate) {
			console.log('found: '+best_candidate.name)
		} else {
			console.log('no cell found!')
		}

		if (resize_target) {
			console.log('node_to_move: '+resize_target.node.name+' side: '+resize_target.side)
		} else {
			console.log('no cell to move!')
		}

	})

	window.addEventListener('mousemove', function(e) {
		if (global.resize_target) {

			let x = e.clientX
			let y = e.clientY

			let resize_target = global.resize_target
			let node = resize_target.node
			let parent = node.parent
			if (!parent) {
				return
			}

			// -------
			// parent component to update weights
			// -------
			let entry = global.layout_dimensions[parent.name]
			if (!entry) {
				return
			}

			let node_index = undefined
			let sum = 0
			let index = -1
			for (let child of parent.children) {
				index += 1
				sum += child.weight
				if (child == node) {
					node_index = index
				}

			}

			let sibling_index = (resize_target.side == SIDE_LEFT || resize_target.side == SIDE_TOP) ? node_index-1 : node_index+1;

			if (parent.orientation == NODE_ORIENTATION_HORIZONTAL) {
				let dx = x - resize_target.mouse_x
				resize_target.mouse_x = x

				let size = entry.rect.w

				let delta = dx / size * sum
				if (resize_target.side == SIDE_LEFT) {
					parent.children[node_index].weight -= delta
					parent.children[sibling_index].weight += delta
				} else if (resize_target.side == SIDE_RIGHT) {
					parent.children[node_index].weight += delta
					parent.children[sibling_index].weight -= delta
				}

			} else if (parent.orientation == NODE_ORIENTATION_VERTICAL) {
				let dy = y - resize_target.mouse_y
				resize_target.mouse_y = y

				let size = entry.rect.h

				let delta = dy / size * sum
				if (resize_target.side == SIDE_TOP) {
					parent.children[node_index].weight -= delta
					parent.children[sibling_index].weight += delta
				} else if (resize_target.side == SIDE_BOTTOM) {
					parent.children[node_index].weight += delta
					parent.children[sibling_index].weight -= delta
				}

			}

		}

	})

	window.addEventListener('mouseup', function(e) {
		global.resize_target = undefined
	})

	setTimeout(update, MSEC_PER_FRAME)

}
