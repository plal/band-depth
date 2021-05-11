"use strict";

const MSEC_PER_FRAME = 32

const NODE_ORIENTATION_HORIZONTAL = 0
const NODE_ORIENTATION_VERTICAL   = 1

const SIDE_LEFT   = 0
const SIDE_TOP    = 1
const SIDE_RIGHT  = 2
const SIDE_BOTTOM = 3

const CLOSEST_SIDE_SIDE = 0;
const CLOSEST_SIDE_DIST = 1;

const MAX_GP = 82

const VIEWS_MARGINS = 15

const TSVIEW_MARGINS = {
	X:15,
	Y:28
}

const AUX_VIEW = {
	DCDF: 0,
	RCDF: 1,
	NONE: 2
}

const BRUSH_STATE = {
	INACTIVE: 0,
	START: 1,
	UPDATE: 2,
	MOVE: 3
}

const SELECT_STATE = {
	INACTIVE: 0,
	SELECTING: 0
}

const FILTER_STATE = {
	INACTIVE: 0,
	START: 1,
	UPDATE: 2,
	MOVE: 3
}

const FILTER_TYPE = {
	BLUE: 0,
	RED: 1,
}

const PANEL_STATE = {
	INACTIVE: 0,
	START_RESIZE: 1,
	RESIZING: 2
}

const PANEL_RESIZE_SIDE = {
	LEFT:0,
	RIGHT:1
}

const FILTER_COLORS = ["#8888FF", "#FF8888"]

const POSITION_COLORS = {
	"C":'#1b9e77',
	"F":'#d95f02',
	"G":'#7570b3'
}

const GROUP_COLORS = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928']
// ['#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5','#ffed6f']
// ['#ff0000','#00ff00','#0000ff','#ffff00','#00ffff','#ff00ff','#ff8900','#aa00ff','#71bb40','#948055','#b12178','#434bab']

const SEQUENTIAL_COLORS = ['#ffffb2','#fed976','#feb24c','#fd8d3c','#f03b20','#bd0026']

const EVENT= {
	FILTER: "event_filter",
	TOGGLE_SYMBOL: "event_toggle_symbol",
	ADD_TABLE_SYMBOLS: "event_add_table_symbols",
	CREATE_GROUP: "event_create_group",
	TOGGLE_GROUP: "event_toggle_group",
	REMOVE_ACTIVE_GROUPS: "event_remove_active_groups",
	CLEAR_CHART: "event_clear_chart",
	UPDATE_START_DATE: "event_update_start_date",
	UPDATE_END_DATE: "event_update_end_date",
	UPDATE_NORM_DATE: "event_update_norm_date",
	RUN_EXTREMAL_DEPTH_ALGORITHM: "event_run_extremal_depth_algorithm",
	RUN_MODIFIED_BAND_DEPTH_ALGORITHM: "event_run_modified_band_depth_algorithm",
	BUILD_CURVES_DENSITY_MATRIX: "event_build_curves_density_matrix",
	MOUSEMOVE: "event_mousemove",
	MOUSEWHEEL: "event_mousewheel",
	MOUSEDOWN: "event_mousedown",
	MOUSEUP: "event_mouseup",
	DBCLICK: "event_dbclick",
	KEYDOWN: "event_keydown",
	CHANGE_AUX_VIEW: "event_change_aux_view",
	GET_STATS_RANKS: "event_GET_STATS_RANKS",
	CLICKED_STAT: "event_clicked_stat",
	CLICK_POS: "event_clicked_pos",
	CHANGE_COLORBY: "event_change_colorby",
	CLUSTER: "event_cluster",
	DRAW_GROUPS_ENVELOPES: "event_draw_groups_envelopes",
	TOGGLE_TABLE: "event_toggle_table",
	SORT_TABLE_BY_COL: "event_sort_table_by_col",
	FULL_TABLE_PROTOS_ONLY: "event_full_table_protos_only",
	FULL_TABLE_SELECTED_ONLY : "event_full_table_selected_only",
	FILTER_FT_BY_POS: "event_filter_ft_by_pos",
	SWITCH_FT_STAT_TYPE: "event_switch_ft_stat_type",
	CHANGE_FT_DEFAULT_SORT: "event_change_ft_default_sort"
}

var global = {
	ui:{},
	layout_root: undefined,
	layout_dimensions: undefined,
	components: [],
	layout_modes: [],
	resize_target: undefined,
	resize_mode_active: false,
	symbols: [],
	selected_symbols: [],
	ref_symbol: undefined,
	chart_symbols: [],
	chart_colors: [],
	groups: [],
	group_count: 0,
	chart_groups: [],
	events: [],
	stats_ranges: {},
	chosen_stats:[],
	chosen_pos:[],
	colorby:'default',
	date_start: "2018-10-01",
	date_end: "2019-06-13",
	date_norm: "2020-07-15",
	mouse: { position:[0,0], last_position:[0,0] },
	color: { colors:['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628'], counter:0 },
	focused_symbol: null,
	key_update_norm: false,
	key_update_start: false,
	key_update_end: false,
	extremal_depth: {fbplot: {active: false, inner_band: {lower:[], upper:[]}, outer_band: {lower:[], upper:[]}, outliers:[] }, ranked_symbols: [] },
	modified_band_depth: {fbplot: {active: false, inner_band: {lower:[], upper:[]}, outer_band: {lower:[], upper:[]}, outliers:[] }, ranked_symbols: [] },
	denselines: { active: false, hashcode: 0, entries:[] },
	viewbox: { x:0, y:0, width:1, height:1, rows:4, cols:4 },
	proj_viewbox: { x:0, y:0, width:1, height:1 },
	recompute_viewbox: true,
	recompute_proj_viewbox: true,
	zoom: 0,
	zoom_x:0,
	zoom_y:0,
	drag: { active:false, startpos:[0,0] },
	proj_drag: { active:false, startpos:[0,0] },
	filter_list:[],
	brush_mode_active: false,
	select_mode_active:false,
	aux_view:'none',
	split_cdf: { breaks:[0], ww:[1], realign:[], split_rank: null, panel_resize_index: null, panel_resize_side: null, panel_resize_last_x: null, filters: [[]]},
}

// -------
// UPDATE 2021-04-22: helper functions to create resizable components
// -------
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

//UPDATE 2021-04-30: order full table by column
function sortTable(n) {
	var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
	table = global.ui.full_table;
	switching = true;
	// Set the sorting direction to ascending:
	if (n==0) {
		dir = "asc"
	} else {
		dir = "desc";
	}
	/* Make a loop that will continue until
	no switching has been done: */
	while (switching) {
		// Start by saying: no switching is done:
		switching = false;
		rows = table.rows;
		/* Loop through all table rows (except the
		first, which contains table headers): */
		for (i = 1; i < (rows.length - 1); i++) {
			// Start by saying there should be no switching:
			shouldSwitch = false;
			/* Get the two elements you want to compare,
			one from current row and one from the next: */
			x = rows[i].getElementsByTagName("TD")[n];
			y = rows[i + 1].getElementsByTagName("TD")[n];
			/* Check if the two rows should switch place,
			based on the direction, asc or desc: */
			if (n>0) {
				if (dir == "asc") {
					if (parseInt(x.innerHTML) > parseInt(y.innerHTML)) {
						// If so, mark as a switch and break the loop:
						shouldSwitch = true;
						break;
					}
				} else if (dir == "desc") {
					if (parseInt(x.innerHTML) < parseInt(y.innerHTML)) {
						// If so, mark as a switch and break the loop:
						shouldSwitch = true;
						break;
					}
				}
			} else if (n<0) {
				if (dir == "asc") {
					if (parseInt(x.innerHTML) > parseInt(y.innerHTML)) {
						// If so, mark as a switch and break the loop:
						shouldSwitch = true;
						break;
					}
				} else if (dir == "desc") {
					if (parseInt(x.innerHTML) < parseInt(y.innerHTML)) {
						// If so, mark as a switch and break the loop:
						shouldSwitch = true;
						break;
					}
				}
			} else {
				if (dir == "asc") {
					if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
						// If so, mark as a switch and break the loop:
						shouldSwitch = true;
						break;
					}
				} else if (dir == "desc") {
					if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
						// If so, mark as a switch and break the loop:
						shouldSwitch = true;
						break;
					}
				}
			}
		}

		if (shouldSwitch) {
			/* If a switch has been marked, make the switch
			and mark that a switch has been done: */
			rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
			switching = true;
			// Each time a switch is done, increase this count by 1:
			switchcount ++;
		}
		// else {
		// 	/* If no switching has been done AND the direction is "asc",
		// 	set the direction to "desc" and run the while loop again. */
		// 	if (switchcount == 0 && dir == "desc") {
		// 		dir = "asc";
		// 		switching = true;
		// 	}
		// }
	}
}

// -------
// old code
// -------
function reset_selections() {
	for (let i=0; i<global.chart_symbols.length; i++) {
		let symbol = global.chart_symbols[i]
		symbol.selected = false;
		if (symbol.ft_ui_col) { symbol.ft_ui_col.style.fontWeight = 'initial' }
	}
	global.selected_symbols = [];
}

function hex_to_rgb(hexstr) {
	let r = parseInt(hexstr.slice(1,3),16) / 255.0
	let g = parseInt(hexstr.slice(3,5),16) / 255.0
	let b = parseInt(hexstr.slice(5,7),16) / 255.0

	return [r,g,b]
}

function rgb_to_hex(rgbarr) {

	let r = Math.trunc(rgbarr[0] * 255).toString(16)
	let g = Math.trunc(rgbarr[1] * 255).toString(16)
	let b = Math.trunc(rgbarr[2] * 255).toString(16)

	r = r.length == 2 ? r : ("0"+r)
	g = g.length == 2 ? g : ("0"+g)
	b = b.length == 2 ? b : ("0"+b)
	let color = "#" + r + g + b + 'BB'

	return color
}

function rgb_lerp(a_rgb, b_rgb, lambda) {
	return [a_rgb[0] * lambda + b_rgb[0] * (1-lambda),
			a_rgb[1] * lambda + b_rgb[1] * (1-lambda),
			a_rgb[2] * lambda + b_rgb[2] * (1-lambda)]
}

function hex_lerp(a_hex, b_hex, lambda) {
	return rgb_to_hex(rgb_lerp(hex_to_rgb(a_hex), hex_to_rgb(b_hex), lambda) )
}

function interpolate_envelope_bounds(envelope, alpha) {
	let upper = envelope.upper;
	let lower = envelope.lower;
	let res   = [];

	for (let i=0; i<upper.length; i++) {
		res[i] = upper[i]*alpha + lower[i]*(1-alpha);
	}

	return res;
}

function earth_movers_distance(ref, sym) {
	let cdf_sym = sym.gt_ranks_dist;
	let sz		= ref.length;

	let dist = 0.0;
	for (let i=0; i<sz; i++) {
		dist += Math.abs(cdf_sym[i]-ref[i]);
	}

	return dist;
}

function reset_group_protos(group) {
	let members = group.members;
	for (let j=0; j<members.length; j++) {
		let member = members[j];
		member.proto = false;
	}
}

function get_perfect_cdf() {
	let perfect_cdf = [];

	let bound;
	if (global.n_ranks !== undefined) {
		bound = global.n_ranks;
	} else {
		bound = global.chart_symbols.length;
	}

	for (let l=0; l<bound; l++) {
		perfect_cdf.push(1.0);
	}

	return perfect_cdf;
}

function get_max_cdf() {
	let chart_symbols = global.chart_symbols;

	let max_cdf = [];

	for (let l=0; l<global.n_ranks; l++) {
		let max_on_rank_l = 0.0;

		for (let j=0; j<chart_symbols.length; j++) {
			let symbol = chart_symbols[j];
			let symbol_values = symbol.gt_ranks_dist;

			max_on_rank_l = Math.max(max_on_rank_l, symbol_values[l]);
		}

		max_cdf.push(max_on_rank_l);
	}

	return max_cdf;
}

function prepare_group_envelope(group, panel_x_min, panel_x_max, panel_rank) {
	let members;
	let n_members;

	if (group.members) {
		members = group.members;
		n_members = members.length;
	} else {
		members = group;
		n_members = members.length;
	}

	let upper_bound = [];
	let lower_bound = [];

	let bound;
	if (global.n_ranks !== undefined) {
		bound = global.n_ranks;
	} else {
		bound = global.chart_symbols.length;
	}

	for (let l=0; l<bound; l++) {
		let max_on_rank_l = 0.0;
		let min_on_rank_l = 1.0;

		for (let j=0; j<n_members; j++) {
			let member = members[j];
			let member_values = member.gt_ranks_dist;

			if (panel_rank == 0) {
				max_on_rank_l = Math.max(max_on_rank_l, member_values[l]);
				min_on_rank_l = Math.min(min_on_rank_l, member_values[l]);
			} else {
				max_on_rank_l = Math.max(max_on_rank_l, (member_values[l] - member_values[panel_x_min-1]));
				min_on_rank_l = Math.min(min_on_rank_l, (member_values[l] - member_values[panel_x_min-1]));
			}
		}

		upper_bound.push(max_on_rank_l);
		lower_bound.push(min_on_rank_l);
	}

	let envelope = {};
	envelope.upper = upper_bound;
	envelope.lower = lower_bound;

	if (group.members) {
		group.envelope = envelope;
	}

	return envelope;
}

function find_group_proto(group, n_protos) {

	reset_group_protos(group);

	if (group.envelope == undefined) {
		return
	}

	let members = group.members;

	if (members.length == 1) {
		members[0].proto = true;
		return;
	}

	// find envelope center protos
	let reference_curve = interpolate_envelope_bounds(group.envelope, 0.5);
	for (let i=0; i<members.length; i++) {
		let member 			   = members[i];
		let member_dist_to_ref = earth_movers_distance(reference_curve, member);

		member.dist_to_ref = member_dist_to_ref;
	}

	members.sort((a, b) => parseFloat(a.dist_to_ref) - parseFloat(b.dist_to_ref));
	for (let i=0; i<n_protos; i++) {
		members[i].proto = true;
	}

	// find envelope upper proto
	let reference_curve_upper = group.envelope.upper;
	for (let i=0; i<members.length; i++) {
		let member 				 = members[i];
		let member_dist_to_upper = earth_movers_distance(reference_curve_upper, member);

		member.dist_to_upper = member_dist_to_upper;
	}

	members.sort((a, b) => parseFloat(a.dist_to_upper) - parseFloat(b.dist_to_upper));
	members[0].proto = true;
	group.upper_proto = members[0];

	// find envelope lower proto
	let reference_curve_lower = group.envelope.lower;
	for (let i=0; i<members.length; i++) {
		let member 				 = members[i];
		let member_dist_to_lower = earth_movers_distance(reference_curve_lower, member);

		member.dist_to_lower = member_dist_to_lower;
	}

	members.sort((a, b) => parseFloat(a.dist_to_lower) - parseFloat(b.dist_to_lower));
	members[0].proto = true;

}

function install_event_listener(component, raw_event_type, context, event_type)
{
	component.addEventListener(raw_event_type, function(e) {
		global.events.push({ event_type: event_type, context: context, raw: e })
	});
}

const REFERENCE_DATE = new Date(1900,0,1)
const MSEC_PER_DAY   = 1000 * 60 * 60 * 24

// expecting data in the form "YYYY-MM-DD"
function date_offset(date_string)
{
	let year  = parseInt(date_string.substr(0,4))
	let month = parseInt(date_string.substr(5,2))
	let day   = parseInt(date_string.substr(8,2))
	return Math.trunc(((new Date(year,month-1,day)) - REFERENCE_DATE)/MSEC_PER_DAY)
}

// expecting data in the form "yyyy-mm-dd"
function date_offset_to_string(date_offset)
{
	let x = new Date(REFERENCE_DATE.getTime() + date_offset * MSEC_PER_DAY)
	return ((x.getYear())+1900).toString().padStart(4,'0') + "-" +
		(x.getMonth()+1).toString().padStart(2,'0') + "-" +
		(x.getUTCDate()).toString().padStart(2,'0')
}


function reset_zoom() {

	global.zoom = 0
	global.recompute_viewbox = true
	global.recompute_proj_viewbox = true

}

function pick_color() {
	let idx = global.color.counter%global.color.colors.length
	let color 	= global.color.colors[idx]
	global.color.counter = global.color.counter + 1

	return color
}

function get_local_position(global_position, component) {
	var rect = component.getBoundingClientRect()

	return [(global_position[0] - rect.left), (global_position[1] - rect.top)]
}

function drawTextBG(ctx, txt, x, y) {

    ctx.save();

    // set font
    ctx.font = "bold 10pt Courier";

    // draw text from top - makes life easier at the moment
    ctx.textBaseline = 'top';
	ctx.textAlign = 'right'

    /// color for background
    ctx.fillStyle = '#000000';

    /// get width of text
    var width = ctx.measureText(txt).width;

    /// draw background rect assuming height of font
    ctx.fillRect(x-width-3, y-3, width+6, parseInt(ctx.font, 12)+6);

    /// text color
    ctx.fillStyle = '#FFFFFF';

    /// draw text on top
    ctx.fillText(txt, x, y);

    /// restore original state
    ctx.restore();
}

function create_groups_table_div() {
	let groups_table_div = document.createElement('div')
	global.ui.groups_table_div = groups_table_div
	groups_table_div.id = 'groups_table_div'
	groups_table_div.style = 'position:relative; width:100%; height:100%; margin:2px; overflow:auto; border-radius:2px; background-color:#FFFFFF'

	let groups_table = groups_table_div.appendChild(document.createElement('table'))
	global.ui.groups_table = groups_table
	groups_table.id = 'groups_table'
	groups_table.style = 'position:block; width:100%; heigth: 100% !important;'

	global.ui.left_panel.appendChild(groups_table_div)

}

function update_groups_table() {

	let group = global.groups[global.group_count-1]
	let row   = global.ui.groups_table.appendChild(document.createElement('tr'))
	let col   = row.appendChild(document.createElement('td'))
	col.innerText = group.name
	col.style = "cursor: pointer"
	col.style.fontFamily = 'Courier'
	col.style.fontSize = '14pt'
	col.style.color ="#6b6f71"
	group.ui_row = row
	group.ui_col = col
	install_event_listener(group.ui_col, 'click', group, EVENT.TOGGLE_GROUP)
}

function create_groups_from_response(groups_obj) {
	global.groups = [];

	let keys = Object.keys(groups_obj);

	for (let i=0; i<keys.length; i++) {
		let group = {};
		group.name 	   = keys[i]
		group.color    = GROUP_COLORS[i]
		group.on_chart = true
		group.members  = []
		group.fbed 	   = { active:false, inner_band: { lower:[], upper:[] }, outer_band: { lower:[], upper:[] }, outliers:[], ranked_symbols: [] }
		group.fbmbd    = { active:false, inner_band: { lower:[], upper:[] }, outer_band: { lower:[], upper:[] }, outliers:[], ranked_symbols: [] }

		let chart_symbols = global.chart_symbols;
		for (let j=0; j<chart_symbols.length; j++) {
			let symbol = chart_symbols[j];

			if (groups_obj[keys[i]].indexOf(symbol.name) > -1) {
				group.members.push(symbol);

				symbol.group = group
			}
		}

		let envelope = prepare_group_envelope(group, 0, 0, 0);
		let n_protos = global.ui.n_protos_select.value
		find_group_proto(group, n_protos);

		global.groups.push(group)
		global.group_count = global.group_count + 1

	}

	// create table with groups to toggle
	if (global.ui.groups_table !== undefined) {
		document.getElementById('groups_table').remove()
	}

	let groups_table = global.ui.groups_table_div.appendChild(document.createElement('table'));
	global.ui.groups_table = groups_table;
	groups_table.id = 'groups_table';
	groups_table.style = 'position:block; width:100%; heigth: 100% !important;';

	//UPDATE 2021-05-03: sort groups table to distance of its first member to max_cdf
	let max_cdf = get_perfect_cdf();
	let groups = global.groups;
	groups.sort((a,b) => parseFloat(earth_movers_distance(max_cdf, a.upper_proto)) - parseFloat(earth_movers_distance(max_cdf, b.upper_proto)))

	let row = global.ui.groups_table.appendChild(document.createElement('tr'))
	for (let i=0; i<groups.length; i++) {
		let group = groups[i]
		let col   = row.appendChild(document.createElement('td'))
		col.innerText = group.name
		col.style = "cursor: pointer"
		col.style.backgroundColor = group.color
		col.style.fontFamily = 'Courier'
		col.style.fontSize = '14pt'
		col.style.textAlign = 'center'
		col.style.fontWeight = 'bold'
		group.ui_row = row
		group.ui_col = col
		install_event_listener(group.ui_col, 'click', group, EVENT.TOGGLE_GROUP)
	}

	create_and_fill_full_table_cluster(-1)
	global.layout_index = 1;
}

async function cluster_chart_data() {
	let data_to_send = {};
	data_to_send['n'] = global.ui.n_clusters_select.value;
	data_to_send['data'] = [];

	for (let i=0; i<global.chart_symbols.length; i++) {
		let symbol = global.chart_symbols[i];
		let symbol_data = {'name':symbol.name, 'x':symbol.projection_coords[0], 'y':symbol.projection_coords[1]};
		data_to_send['data'].push(symbol_data);
	}

	let str_to_send = btoa(encodeURI(JSON.stringify(data_to_send)));

	var xhttp = new XMLHttpRequest();
	xhttp.open("POST", "http://localhost:8888/cluster", true);
	xhttp.setRequestHeader('Content-Type','text/plain');
	xhttp.responseType = 'json';
	xhttp.send(str_to_send);

	xhttp.onload = function() {
		create_groups_from_response(xhttp.response);
	}

}

function start_stats_ranges(player_summary) {
	let stats = Object.keys(player_summary);

	for (let i=0; i<stats.length; i++) {
		if (global.stats_ranges[stats[i]] == undefined) {
			global.stats_ranges[stats[i]] = [player_summary[stats[i]], player_summary[stats[i]]]
		} else {
			global.stats_ranges[stats[i]][0] = Math.min(global.stats_ranges[stats[i]][0], player_summary[stats[i]])
			global.stats_ranges[stats[i]][1] = Math.max(global.stats_ranges[stats[i]][1], player_summary[stats[i]])
		}
	}
}

function update_stats_ranges() {
	global.stats_ranges = {};

	for (let j=0; j<global.chart_symbols.length; j++) {
		let player_summary = global.chart_symbols[j].summary;
		let stats = Object.keys(player_summary);

		for (let i=0; i<stats.length; i++) {
			if (global.stats_ranges[stats[i]] == undefined) {
				global.stats_ranges[stats[i]] = [player_summary[stats[i]], player_summary[stats[i]]]
			} else {
				global.stats_ranges[stats[i]][0] = Math.min(global.stats_ranges[stats[i]][0], player_summary[stats[i]])
				global.stats_ranges[stats[i]][1] = Math.max(global.stats_ranges[stats[i]][1], player_summary[stats[i]])
			}
		}
	}
}

function byteCount(s) {
    return encodeURI(s).split(/%..|./).length - 1;
}

async function project_chart_data() {
	let data_to_send = {};

	for (let i=0; i<global.chart_symbols.length; i++) {
		let symbol = global.chart_symbols[i];
		data_to_send[symbol.name] = symbol.gt_ranks_dist
	}

	let str_to_send = btoa(encodeURI(JSON.stringify(data_to_send)))

	var xhttp = new XMLHttpRequest();
	xhttp.open("POST", "http://localhost:8888/project", true);
	xhttp.setRequestHeader('Content-Type','text/plain');
	xhttp.responseType = 'json';
	xhttp.send(str_to_send);

	xhttp.onload = function() {
		for(let i=0; i<global.chart_symbols.length; i++) {
			let symbol = global.chart_symbols[i];
			symbol.projection_coords = xhttp.response[symbol.name]
		}
	}

}

async function download_symbol_data(symbol)
{
	let result
	try {
		let result = await fetch(encodeURI('http://localhost:8888/get?p='+symbol.name))
		let data   = await result.json()

		let dict = {}
		let summ = {'points':0, 'assists':0, 'rebounds':0, 'steals':0, 'blocks':0, 'turnovers':0, 'fouls':0}
		for (let i=0;i<data.data[0].game_ids.length;i++) {
			let game_data = {}
			let game_id = parseInt(data.data[0].game_ids[i])
			if (game_id > 82) { continue }
			game_data.team  	= data.data[0].teams[i]
			game_data.date  	= data.data[0].dates[i]
			game_data.points    = parseInt(data.data[0].points[i])
			summ.points   		+= game_data.points;
			game_data.assists   = parseInt(data.data[0].assists[i])
			summ.assists  		+= game_data.assists;
			game_data.rebounds  = parseInt(data.data[0].rebounds[i])
			summ.rebounds  		+= game_data.rebounds;
			game_data.steals    = parseInt(data.data[0].steals[i])
			summ.steals  		+= game_data.steals;
			game_data.blocks    = parseInt(data.data[0].blocks[i])
			summ.blocks  		+= game_data.blocks;
			game_data.turnovers = parseInt(data.data[0].turnovers[i])
			summ.turnovers  	+= game_data.turnovers;
			game_data.fouls 	= parseInt(data.data[0].fouls[i])
			summ.fouls  		+= game_data.fouls;

			dict[game_id] = game_data
		}

		symbol.position = data.data[0].position
		symbol.data = dict

		// let summ = {}
		// summ.points = data.data[0].points.reduce((a, b) => a + b, 0)
		// summ.assists = data.data[0].assists.reduce((a, b) => a + b, 0)
		// summ.rebounds = data.data[0].rebounds.reduce((a, b) => a + b, 0)
		// summ.steals = data.data[0].steals.reduce((a, b) => a + b, 0)
		// summ.blocks = data.data[0].blocks.reduce((a, b) => a + b, 0)
		// summ.turnovers = data.data[0].turnovers.reduce((a, b) => a + b, 0)
		// summ.fouls = data.data[0].fouls.reduce((a, b) => a + b, 0)

		// start_stats_ranges(summ);

		symbol.summary = summ

		global.recompute_viewbox = true
	} catch (e) {
		console.log("Fatal Error: couldn't download symbol data " + symbol.name)
		return
	}
}

function add_symbol_to_chart(symbol, color) {
	symbol.on_chart = true
	global.chart_symbols.push(symbol)
	global.chart_colors.push(color)

	// update default table
	symbol.ui_col.style.color = color
	// symbol.ui_col.style.fontWeight = 'bold'

	// update full table
	if (symbol.ft_ui_col && symbol.ft_ui_row) {
		if (symbol.group) {
			symbol.ft_ui_row.style.backgroundColor = symbol.group.color
		}
		// symbol.ft_ui_col.style.fontWeight = 'bold'
	}

}

function remove_symbol_from_list(symbol, list) {
	let to_remove = list.indexOf(symbol)
	if (to_remove > -1) {
	  list.splice(to_remove, 1);
	}
}

function remove_symbol_from_chart(symbol) {
	let to_remove = global.chart_symbols.indexOf(symbol)
	if (to_remove > -1) {
	  global.chart_symbols.splice(to_remove, 1);
	  global.chart_colors.splice(to_remove, 1);
	}

	symbol.on_chart = false

	//update default table
	symbol.ui_col.style.color = "#000000"
	// symbol.ui_col.style.fontWeight = 'initial'

	// update full table
	if (symbol.ft_ui_col && symbol.ft_ui_row) {
		symbol.ft_ui_row.style.backgroundColor = "#FFFFFF"
		symbol.ft_ui_col.style.fontWeight = 'initial'
	}
}

//--------------
// if state is even we add every symbol on table to the chart;
// if state is odd we remove every symbol from the chart;
//--------------

function add_table_symbols() {
	let symbols = global.symbols

	for (let i=0; i<symbols.length; i++) {

		let symbol = symbols[i]

		let color  = pick_color()

		//--------------
		// if symbol is on table and not on chart, add it to chart
		//--------------
		if (symbol.on_table) {
			// add symbol to chart
			if (!symbol.on_chart) {
				add_symbol_to_chart(symbol,color)
				if (symbol.data == null) {
					download_symbol_data(symbol)
				}
			}
		}
	}
}


function create_group() {
	let chart_symbols = global.chart_symbols

	let group 	   = {}
	let group_name = window.prompt("Enter group name", "Group " + global.group_count)
	group.name 	   = group_name
	group.color    = pick_color()
	group.on_chart = false
	group.members  = []
	group.fbed 	   = { active:false, inner_band: { lower:[], upper:[] }, outer_band: { lower:[], upper:[] }, outliers:[], ranked_symbols: [] }
	group.fbmbd    = { active:false, inner_band: { lower:[], upper:[] }, outer_band: { lower:[], upper:[] }, outliers:[], ranked_symbols: [] }

	for (let i=0; i<chart_symbols.length; i++) {
		let symbol = chart_symbols[i]

		if(symbol.selected) {
			group.members.push(symbol)
			symbol.group = group
			// let to_remove = global.chart_symbols.indexOf(symbol)
			// if (to_remove > -1) {
			//   global.chart_symbols.splice(to_remove, 1);
			//   global.chart_colors.splice(to_remove, 1);
			// }
			// symbol.on_chart = false
			// symbol.ui_col.style.color = "#6b6f71"
			// symbol.ui_col.style.fontWeight = 'initial'
		}

	}

	global.groups.push(group)

	global.group_count = global.group_count + 1

	// if (global.group_count == 1) {
	// 	create_groups_table_div()
	// 	update_groups_table()
	// } else if (global.group_count > 1) {
	// 	update_groups_table()
	// }

}

function add_group_to_chart(group) {
	group.on_chart = true
	global.chart_groups.push(group)
	global.chart_colors.push(group.color)
	// group.ui_col.style.color = group.color
	// group.ui_col.style.fontWeight = 'bold'
	group.ui_col.style.backgroundColor = group.color

	//--------------
	// add every group member to chart
	//--------------
	let members = group.members
	for (let i=0; i<members.length; i++) {
		let member = members[i]

		if (!member.on_chart) {
			add_symbol_to_chart(member, group.color)
		}

	}
}

function remove_group_from_chart(group) {
	//--------------
	// remove every group member from chart before removing group
	//--------------
	let members = group.members
	for (let i=0; i<members.length; i++) {
		let member = members[i]
		remove_symbol_from_chart(member)
	}

	let to_remove = global.chart_groups.indexOf(group)
	if (to_remove > -1) {
	  global.chart_groups.splice(to_remove, 1);
	}
	group.on_chart = false
	// group.ui_col.style.color = "#6b6f71"
	// group.ui_col.style.fontWeight = 'initial'
	group.ui_col.style.backgroundColor = '#FFFFFF'
}

function remove_group(group) {

	remove_group_from_chart(group)

	let to_remove = global.groups.indexOf(group)
	if (to_remove > -1) {
		global.groups.splice(to_remove, 1)
	}

	global.group_count = global.group_count - 1;
	if (global.group_count == 0) {
		document.getElementById('groups_table').remove()
		document.getElementById('groups_table_div').remove()
	}
}

function remove_active_groups() {
	let groups = global.groups

	//--------------
	// search for active groups and remove them
	//--------------
	let i=0
	while (i<groups.length) {

		let group = groups[i]

		if (group.on_chart) {
			console.log(`Removing ${group.name}`)
			remove_group(group)
			document.getElementById("groups_table").deleteRow(i)
			global.group_count = global.group_count - 1

		} else {
			i = i+1
		}

	}

	//--------------
	// if no groups, remove group table from system
	//--------------
	if (global.group_count == 0) {
		document.getElementById('groups_table').remove()
		document.getElementById('groups_table_div').remove()
	}

}

function reset_groups() {
	let chart_symbols = global.chart_symbols;
	let groups        = global.groups;

	for (let i=0; i<chart_symbols.length; i++) {
		let symbol = chart_symbols[i];
		symbol.group = null;
		symbol.proto = false;
	}

	for (let i=0; i<groups.length; i++) {
		let group = groups[i];
		let members = group.members;
		for (let j=0; j<members.length; j++) {
			let member = members[j]
			member.group = null;
		}
		reset_group_protos(group);
	}

	document.getElementById('protos_only_checkbox').checked = false;
	global.groups 		   = [];
	global.group_count 	   = 0;
}


function clear_chart() {
	let symbols = global.symbols
	let groups  = global.groups
	//--------------
	// remove every symbol from chart
	//--------------
	for (let i=0; i<symbols.length; i++) {

		let symbol = symbols[i];

		if (symbol.on_chart) {
			remove_symbol_from_chart(symbol);
		}

		symbol.selected = false;
	}

	//--------------
	// remove every group from chart
	//--------------
	for (let i=0; i<groups.length; i++) {

		let group = groups[i];

		if (group.on_chart) {
			remove_group_from_chart(group);
		}
	}

	global.chart_symbols = [];
	global.chart_colors  = [];
	global.chart_groups	 = [];
	global.selected_symbols = [];

	if (groups.length > 0) {
		reset_groups();
	}

	global.split_cdf = { breaks:[0], ww:[1], realign:[], split_rank: null,
						 panel_resize_index: null, panel_resize_side: null, panel_resize_last_x: null,
						 filters: [[]] };

	global.ui.draw_groups_envelope_btn.checked = false;
	global.layout_index = 0;
}

function hashcode(str) {
    var hash = 2987407, i, chr;
    for (i = 0; i < str.length; i++) {
      chr   = str.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function prepare_fb_inner_band(depth_type, group) {

	let depth;

	if (depth_type == "ed") {
		depth   = global.extremal_depth
	} else if (depth_type == "mbd") {
		depth   = global.modified_band_depth
	}

	let ranked_symbols = null
	if (typeof group !== "undefined") {
		if (depth_type == "ed") {
			ranked_symbols = group.fbed.ranked_symbols
		} else if (depth_type == "mbd") {
			ranked_symbols = group.fbmbd.ranked_symbols
		}

	} else {
		ranked_symbols = depth.ranked_symbols
	}

	let n = ranked_symbols.length
	let n_timesteps = ranked_symbols[0].ts_current_values.length //symbol.ts_current_values

	let a = Math.floor(n/2)
	let b = n

	let ymin = new Array(n_timesteps)
	let ymax = new Array(n_timesteps)

	for (let j=0;j<n_timesteps;j++) {
		let y = ranked_symbols[a].ts_current_values[j]
		ymin[j] = y
		ymax[j] = y
		for (let k=a+1;k<b;++k) {
			y = ranked_symbols[k].ts_current_values[j]
			ymin[j] = Math.min(y,ymin[j])
			ymax[j] = Math.max(y,ymax[j])
		}
	}

	if (typeof group !== "undefined") {
		if (depth_type == "ed") {
			group.fbed.inner_band.lower = ymin
			group.fbed.inner_band.upper = ymax
		} else if (depth_type == "mbd") {
			group.fbmbd.inner_band.lower = ymin
			group.fbmbd.inner_band.upper = ymax
		}
	} else {
		depth.fbplot.inner_band.lower = ymin
		depth.fbplot.inner_band.upper = ymax
	}

}

function prepare_fb_outer_band(depth_type, group) {

	let depth;

	if (depth_type == "ed") {
		depth = global.extremal_depth
	} else if (depth_type == "mbd") {
		depth = global.modified_band_depth
	}

	let ymin = null
	let ymax = null
	if (typeof group !== "undefined") {
		if (depth_type == "ed") {
			ymin = group.fbed.inner_band.lower
			ymax = group.fbed.inner_band.upper
		} else if (depth_type == "mbd") {
			ymin = group.fbmbd.inner_band.lower
			ymax = group.fbmbd.inner_band.upper
		}

	} else {
		ymin = depth.fbplot.inner_band.lower
		ymax = depth.fbplot.inner_band.upper
	}

	let n_timesteps = ymin.length

	let ymax_outer = new Array(n_timesteps)
	let ymin_outer = new Array(n_timesteps)

	for (let j=0;j<n_timesteps;j++) {

		let iqr = ymax[j]-ymin[j]
		let mid = ((ymax[j]+ymin[j])/2)

		ymin_outer[j] = mid - (0.75*iqr)
		ymax_outer[j] = mid + (0.75*iqr)

	}

	if (typeof group !== "undefined") {
		if (depth_type == "ed") {
			group.fbed.outer_band.lower = ymin_outer
			group.fbed.outer_band.upper = ymax_outer
		} else if (depth_type == "mbd") {
			group.fbmbd.outer_band.lower = ymin_outer
			group.fbmbd.outer_band.upper = ymax_outer
		}
	} else {
		depth.fbplot.outer_band.lower = ymin_outer
		depth.fbplot.outer_band.upper = ymax_outer
	}

}

function prepare_fb_outliers(depth_type, group) {

	let depth

	if (depth_type == "ed") {
		depth = global.extremal_depth
	} else if (depth_type == "mbd") {
		depth = global.modified_band_depth
	}

	let ranked_symbols = null
	let outer_band     = null
	let outliers	   = []

	if (typeof group !== "undefined") {
		if (depth_type == "ed") {
			ranked_symbols = group.fbed.ranked_symbols
			outer_band 	   = group.fbed.outer_band
			outliers 	   = group.fbed.outliers
		} else if (depth_type == "mbd") {
			ranked_symbols = group.fbmbd.ranked_symbols
			outer_band 	   = group.fbmbd.outer_band
			outliers 	   = group.fbmbd.outliers
		}

	} else {
		ranked_symbols = depth.ranked_symbols
		outer_band     = depth.fbplot.outer_band
		outliers 	   = depth.fbplot.outliers
	}

	let n_timesteps = ranked_symbols[0].ts_current_values.length
	let n 		 	= ranked_symbols.length

	outliers = []

	for(let i=0; i<n; i++) {
		let curve = ranked_symbols[i]

		for(let j=0; j<n_timesteps; j++) {
			if ((curve.ts_current_values[j] > outer_band.upper[j]) || (curve.ts_current_values[j] <  outer_band.lower[j])) {
				outliers.push(ranked_symbols[i])
				break
			}
		}

	}

	if (typeof group !== "undefined") {
		if (depth_type == "ed") {
			group.fbed.outliers = outliers
		} else if (depth_type == "mbd") {
			group.fbmbd.outliers = outliers
		}
	} else {
		depth.fbplot.outliers = outliers
	}
}

function create_checkbox(name, value) {
	let check = document.createElement('input');
	check.type = "checkbox";
	if (typeof name !== 'undefined') {
		check.name = name;
	}
	if (typeof value !== 'undefined') {
		check.value = value;
	}

	return check
}

function create_checkbox_label(check, text) {
	let lbl = document.createElement('label');
	lbl.setAttribute("for", check);
	lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF';
	lbl.innerHTML = text;

	return lbl
}

function create_section_label(text) {
	let lbl = document.createElement('label');
	lbl.style = 'font-family:Courier; font-size:15pt; color: #FFFFFF';
	lbl.innerHTML = text;

	return lbl;
}

function create_option(value, text) {
	let opt = document.createElement('option')
	opt.value = value
	opt.innerHTML = text

	return opt
}

function set_bubble(range, bubble) {
	const val = range.value;
	const min = range.min ? range.min : 1;
	const max = range.max ? range.max : 82;
	// const newVal = Number(((val - min) * 82) / (max - min));
	bubble.innerHTML = val;
	bubble.style.fontFamily = 'Courier';
	bubble.style.fontSize = '15pt;';
	bubble.style.color = '#FFFFFF';

	// Sorta magic numbers based on size of the native UI thumb
	// bubble.style.left = `calc(${newVal}% + (${8 - newVal * 0.15}px))`;
}

function toggle_class(el, cname) {
	if (el.className.indexOf(cname) >= 0) {
		el.className = el.className.replace(cname,"");
	} else {
		let ths = document.getElementsByTagName("th");
		for (let i=0; i<ths.length; i++) {
			let th = ths[i];
			th.className = "";
		}
		el.className += cname;
	}
}

function check_ft_pos_filters(symbol) {
	let pos_filters = document.getElementsByClassName('ft-pos-filter');
	let symbol_pos  = symbol.position;

	let all_unchecked = true;
	let matched_pos   = false;

	for (let i=0; i<pos_filters.length; i++) {
		if (pos_filters[i].checked) {
			all_unchecked = false;
			if (symbol.position.includes(pos_filters[i].value)) {
				matched_pos = true;
			}
		}
	}

	return (all_unchecked || matched_pos)
}

function get_ft_stat_type() {
	let stats_radios = document.getElementsByName('stats_type');

	for (let i=0; i<stats_radios.length; i++) {
		if (stats_radios[i].checked) {
			return stats_radios[i].value;
		}
	}
}

function compareArrays(a, b) {
  var elA, elB, i, len;
  for (i = 0, len = Math.min(a.length, b.length); i < len; i++) {
    elA = a[i], elB = b[i];
    if (elA > elB) return 1;
    if (elA < elB) return -1;
  }
  return b.length - a.length;
};

function create_and_fill_full_table_cluster(sort_index) {

	if (global.ui.full_table !== undefined) {
		document.getElementById('full_table').remove()
	}

	let full_table 		 = global.ui.full_table_div.appendChild(document.createElement('table'))
	full_table.id = 'full_table'
	global.ui.full_table = full_table
	full_table.style 	 = 'position:block; width:100%; heigth: 100% !important;\
							border:1px solid black; border-collapse:collapse'

	let headers = ['name','points','assists','rebounds','steals','blocks','turnovers','fouls'];
	let header_row = full_table.insertRow(-1);
	for (let i=0;i<headers.length; i++) {
		let header_cell = header_row.appendChild(document.createElement('th'));
		header_cell.innerHTML 		 = headers[i];
		header_cell.style 			 = "cursor: pointer"
		header_cell.style.fontFamily = "Courier"
		header_cell.style.fontSize 	 = "14pt"
		header_cell.style.color 	 = "#6b6f71"
        header_cell.style.border	 = "1px solid black"
		if (i==sort_index) {
			toggle_class(header_cell, "selected")
		}
		install_event_listener(header_cell, 'click', header_cell, EVENT.SORT_TABLE_BY_COL)

	}

	let chart_symbols = global.chart_symbols;
	let max_cdf = get_perfect_cdf();
	let stat_type = get_ft_stat_type();
	let default_sort = document.getElementById('ft_default_sort_select').value
	// console.log(stat_type)

	//UPDATE 2021-05-03: sort table according to different parameters (default: earth movers distance to max cdf)
	if (sort_index>0) {
		if (stat_type === 'totals') {
			chart_symbols.sort((a,b) => parseInt(b.summary[headers[sort_index]]) - parseInt(a.summary[headers[sort_index]]))
		} else if (stat_type === 'pg') {
			chart_symbols.sort((a,b) => (parseInt(b.summary[headers[sort_index]])/Object.keys(b.data).length) - (parseInt(a.summary[headers[sort_index]])/Object.keys(a.data).length))
		}
	} else if (sort_index<0) {
		if (default_sort === 'mcdf') {
			chart_symbols.sort((a,b) => parseFloat(earth_movers_distance(max_cdf, a)) - parseFloat(earth_movers_distance(max_cdf, b)))
		} else if (default_sort === 'lex') {
			chart_symbols.sort((a,b) => -compareArrays(a.gt_ranks_dist,b.gt_ranks_dist))
		}
	} else {
		chart_symbols.sort((a,b) => a.name.localeCompare(b.name))
	}
	for (let i=0;i<chart_symbols.length;i++) {
		let symbol = chart_symbols[i]
		let symbol_gp = get_gp(symbol);

		if (!check_ft_pos_filters(symbol)) { continue; }
		if (document.getElementById('protos_only_checkbox').checked) {
			if (!symbol.proto) { continue; }
		}
		if (document.getElementById('selected_only_checkbox').checked) {
			if (!symbol.selected) { continue; }
		}
		let row    = full_table.appendChild(document.createElement('tr'));
		let col    = row.appendChild(document.createElement('td'));

		row.style.backgroundColor = symbol.group.color;
		col.innerText 		 = symbol.name;
		col.style 			 = "cursor: pointer";
		col.style.fontFamily = 'Courier';
		col.style.fontSize 	 = '14pt';
		col.style.color 	 = "#000000";
		col.style.border	 = "1px solid black";

		for (let j=1; j<headers.length; j++) {
			let stat_col = row.appendChild(document.createElement('td'));

			if (stat_type === 'totals') {
				stat_col.innerText 			 = symbol.summary[headers[j]];
			} else if (stat_type === 'pg') {
				stat_col.innerText 			 = (symbol.summary[headers[j]]/symbol_gp).toFixed(2);
			}
			stat_col.style.fontFamily 	 = 'Courier';
			stat_col.style.fontSize 	 = '14pt';
			stat_col.style.color 	 	 = "#000000";
			stat_col.style.border	 	 = "1px solid black";
		}

		symbol.ft_ui_row = row;
		symbol.ft_ui_col = col;
		install_event_listener(symbol.ft_ui_col, 'click', symbol, EVENT.TOGGLE_SYMBOL);
	}
}


function fill_full_table() {
	let ft = global.ui.full_table;
	let rows = ft.rows;

	for (let i=0; i<global.symbols.length; i++) {
		let symbol = global.symbols[i]
		let symbol_summary = symbol.summary;
		let row = rows[i+1];
		if (symbol.group) {
			row.style.backgroundColor = symbol.group.color
		}
		row.cells[1].innerHTML = symbol_summary['points'];
		row.cells[1].style.color = '#000000'
		row.cells[2].innerHTML = symbol_summary['assists'];
		row.cells[2].style.color = '#000000'
		row.cells[3].innerHTML = symbol_summary['rebounds'];
		row.cells[3].style.color = '#000000'
		row.cells[4].innerHTML = symbol_summary['steals'];
		row.cells[4].style.color = '#000000'
		row.cells[5].innerHTML = symbol_summary['blocks'];
		row.cells[5].style.color = '#000000'
		row.cells[6].innerHTML = symbol_summary['turnovers'];
		row.cells[6].style.color = '#000000'
		row.cells[7].innerHTML = symbol_summary['fouls'];
		row.cells[7].style.color = '#000000'
	}
}

function get_component(component_name) {
	for (let component of global.components) {
		if (component.position == component_name) {
			return component.component;
		}
	}
	return
}

function fill_ui_components()
{

	//-------
	// controls component
	//-------

	let stats_section_lbl = create_section_label('Stats');

	//----------
	// stats checkboxes
	//----------

	let pts_btn = create_checkbox('stat','points');
	global.ui.pts_btn = pts_btn;
	install_event_listener(pts_btn, 'click', pts_btn, EVENT.CLICKED_STAT);

	let pts_lbl = create_checkbox_label(pts_btn, 'Points');
	global.ui.pts_lbl = pts_lbl

	let asts_btn = create_checkbox('stat','assists');
	global.ui.asts_btn = asts_btn;
	install_event_listener(asts_btn, 'click', asts_btn, EVENT.CLICKED_STAT);

	let asts_lbl = create_checkbox_label(asts_btn, 'Assists');
	global.ui.asts_lbl = asts_lbl;

	let rbds_btn = create_checkbox('stat','rebounds');
	global.ui.rbds_btn = rbds_btn;
	install_event_listener(rbds_btn, 'click', rbds_btn, EVENT.CLICKED_STAT);

	let rbds_lbl = create_checkbox_label(rbds_btn, 'Rebounds');
	global.ui.rbds_lbl = rbds_lbl;

	let stls_btn = create_checkbox('stat','steals');
	global.ui.stls_btn = stls_btn;
	install_event_listener(stls_btn, 'click', stls_btn, EVENT.CLICKED_STAT);

	let stls_lbl = create_checkbox_label(stls_btn, 'Steals');
	global.ui.stls_lbl = stls_lbl;

	let blcks_btn = create_checkbox('stat','blocks');
	global.ui.blcks_btn = blcks_btn;
	install_event_listener(blcks_btn, 'click', blcks_btn, EVENT.CLICKED_STAT);

	let blcks_lbl = create_checkbox_label(blcks_btn, 'Blocks');
	global.ui.blcks_lbl = blcks_lbl;

	let tos_btn = create_checkbox('stat','turnovers');
	global.ui.tos_btn = tos_btn;
	install_event_listener(tos_btn, 'click', tos_btn, EVENT.CLICKED_STAT);

	let tos_lbl = create_checkbox_label(tos_btn, 'Turnovers');
	global.ui.tos_lbl = tos_lbl;

	let fls_btn = create_checkbox('stat','fouls');
	global.ui.fls_btn = fls_btn;
	install_event_listener(fls_btn, 'click', fls_btn, EVENT.CLICKED_STAT);

	let fls_lbl = create_checkbox_label(fls_btn, 'Fouls');
	global.ui.fls_lbl = fls_lbl;

	let stats_grid = document.createElement('div');
	stats_grid.id    = stats_grid;
	stats_grid.style = 'display:grid; align-content:space-around; grid-template-columns:repeat(2, 50px)';
	stats_grid.appendChild(pts_btn);
	stats_grid.appendChild(pts_lbl);
	stats_grid.appendChild(asts_btn);
	stats_grid.appendChild(asts_lbl);
	stats_grid.appendChild(rbds_btn);
	stats_grid.appendChild(rbds_lbl);
	stats_grid.appendChild(stls_btn);
	stats_grid.appendChild(stls_lbl);
	stats_grid.appendChild(blcks_btn);
	stats_grid.appendChild(blcks_lbl);
	stats_grid.appendChild(tos_btn);
	stats_grid.appendChild(tos_lbl);
	stats_grid.appendChild(fls_btn);
	stats_grid.appendChild(fls_lbl);
	global.ui.stats_grid = stats_grid;

	let get_stats_ranks_btn = document.createElement('button')
	get_stats_ranks_btn.id 			= "get_stats_ranks_btn"
	get_stats_ranks_btn.textContent = 'get stats ranks'
	get_stats_ranks_btn.style 		= "position:relative; width:98%; margin:2px;\
	 								   border-radius:13px; background-color:#AAAAAA; font-family:Courier; font-size:12pt;"
	global.ui.get_stats_ranks_btn = get_stats_ranks_btn
	install_event_listener(get_stats_ranks_btn, 'click', get_stats_ranks_btn, EVENT.GET_STATS_RANKS)

	let pos_section_lbl = create_section_label('Positions');

	//----------
	// positions checkboxes
	//----------

	let g_btn = create_checkbox('position','G');
	global.ui.g_btn = g_btn;
	install_event_listener(g_btn, 'click', g_btn, EVENT.CLICKED_POS);

	let g_lbl = create_checkbox_label(g_btn, 'Guard');
	global.ui.g_lbl = g_lbl

	let f_btn = create_checkbox('position','F');
	global.ui.f_btn = f_btn;
	install_event_listener(f_btn, 'click', f_btn, EVENT.CLICKED_POS);

	let f_lbl = create_checkbox_label(f_btn, 'Forward');
	global.ui.f_lbl = f_lbl

	let c_btn = create_checkbox('position','C');
	global.ui.c_btn = c_btn;
	install_event_listener(c_btn, 'click', c_btn, EVENT.CLICKED_POS);

	let c_lbl = create_checkbox_label(c_btn, 'Center');
	global.ui.c_lbl = c_lbl

	let pos_grid = document.createElement('div');
	pos_grid.id    = pos_grid;
	pos_grid.style = 'display:grid; align-content:space-around; grid-template-columns:repeat(2, 50px)';
	pos_grid.appendChild(g_btn);
	pos_grid.appendChild(g_lbl);
	pos_grid.appendChild(f_btn);
	pos_grid.appendChild(f_lbl);
	pos_grid.appendChild(c_btn);
	pos_grid.appendChild(c_lbl);
	global.ui.pos_grid = pos_grid;

	//----------
	// min games played filter
	//----------

	let min_gp_lbl = create_section_label('Min. Games Played');

	let min_gp_sld = document.createElement('input');
	min_gp_sld.type 	 = 'range';
	min_gp_sld.min 		 = 1;
	min_gp_sld.max 		 = 82;
	min_gp_sld.value 	 = 30;
	min_gp_sld.className = "slider"
	min_gp_sld.style	 = 'width:98%;'
	global.min_gp_sld 	 = min_gp_sld;

	let min_gp_val = document.createElement('output');
	global.min_gp_val = min_gp_val;
	min_gp_val.style.left = '50px';

	min_gp_sld.addEventListener("input", () => {
    	set_bubble(min_gp_sld, min_gp_val);
  	});

	// ----------
	// other controls (REVISE USELESS CONTROLS LATER)
	// ----------
	let normalize_btn = document.createElement('input')
	normalize_btn.type 		= "checkbox"
	global.ui.normalize_btn = normalize_btn

	let normalize_lbl = document.createElement('label')
	normalize_lbl.setAttribute("for", normalize_btn)
	normalize_lbl.style 	= 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:230px'
	normalize_lbl.innerHTML = 'Normalize values'
	global.ui.normalize_lbl = normalize_lbl

	let normalize_grid = document.createElement('div')
	normalize_grid.id 	 = normalize_grid
	normalize_grid.style = 'display:flex; flex-direction:row; align-content:space-around'
	normalize_grid.appendChild(normalize_lbl)
	normalize_grid.appendChild(normalize_btn)
	global.ui.normalize_grid = normalize_grid

	let use_diffs_btn = document.createElement('input')
	use_diffs_btn.type 		= "checkbox"
	global.ui.use_diffs_btn = use_diffs_btn

	let use_diffs_lbl = document.createElement('label')
	use_diffs_lbl.setAttribute("for", use_diffs_btn)
	use_diffs_lbl.style 	= 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:120px'
	use_diffs_lbl.innerHTML = 'Use diffs on aux view'
	global.ui.use_diffs_lbl = use_diffs_lbl

	let use_diffs_grid = document.createElement('div')
	use_diffs_grid.id    = use_diffs_grid
	use_diffs_grid.style = 'display:flex; flex-direction:row; align-content:space-around'
	use_diffs_grid.appendChild(use_diffs_lbl)
	use_diffs_grid.appendChild(use_diffs_btn)
	global.ui.use_diffs_grid = use_diffs_grid

	let modified_band_depth_btn = document.createElement('input')
	modified_band_depth_btn.type 	  = "checkbox"
	global.ui.modified_band_depth_btn = modified_band_depth_btn
	install_event_listener(modified_band_depth_btn, 'click', modified_band_depth_btn, EVENT.RUN_MODIFIED_BAND_DEPTH_ALGORITHM)

	let modified_band_depth_lbl = document.createElement('label')
	modified_band_depth_lbl.setAttribute("for", modified_band_depth_btn)
	modified_band_depth_lbl.style 	  = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:230px'
	modified_band_depth_lbl.innerHTML = 'Functional Boxplot MBD'
	global.ui.modified_band_depth_lbl = modified_band_depth_lbl

	let modified_band_depth_grid = document.createElement('div')
	modified_band_depth_grid.id    = modified_band_depth_grid
	modified_band_depth_grid.style = 'display:flex; flex-direction:row; align-content:space-around'
	modified_band_depth_grid.appendChild(modified_band_depth_lbl)
	modified_band_depth_grid.appendChild(modified_band_depth_btn)
	global.ui.modified_band_depth_grid = modified_band_depth_grid

	let mbd_draw_outliers_btn = document.createElement('input')
	mbd_draw_outliers_btn.type 		= "checkbox"
	global.ui.mbd_draw_outliers_btn = mbd_draw_outliers_btn

	let mbd_draw_outliers_lbl = document.createElement('label')
	mbd_draw_outliers_lbl.setAttribute("for", mbd_draw_outliers_btn)
	mbd_draw_outliers_lbl.style 	= 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:160px;'
	mbd_draw_outliers_lbl.innerHTML = '- Draw outliers'
	global.ui.mbd_draw_outliers_lbl = mbd_draw_outliers_lbl

	let mbd_draw_outliers_grid = document.createElement('div')
	mbd_draw_outliers_grid.id    = mbd_draw_outliers_grid
	mbd_draw_outliers_grid.style = 'display:flex; flex-direction:row; align-content:space-around;' //justify-content:flex-end'
	mbd_draw_outliers_grid.appendChild(mbd_draw_outliers_lbl)
	mbd_draw_outliers_grid.appendChild(mbd_draw_outliers_btn)
	global.ui.mbd_draw_outliers_grid = mbd_draw_outliers_grid

	let extremal_depth_btn = document.createElement('input')
	extremal_depth_btn.type 	 = "checkbox"
	global.ui.extremal_depth_btn = extremal_depth_btn
	install_event_listener(extremal_depth_btn, 'click', extremal_depth_btn, EVENT.RUN_EXTREMAL_DEPTH_ALGORITHM)

	let extremal_depth_lbl = document.createElement('label')
	extremal_depth_lbl.setAttribute("for", extremal_depth_btn)
	extremal_depth_lbl.style 	 = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:230px'
	extremal_depth_lbl.innerHTML = 'Functional Boxplot ED'
	global.ui.extremal_depth_lbl = extremal_depth_lbl

	let extremal_depth_grid = document.createElement('div')
	extremal_depth_grid.id    = extremal_depth_grid
	extremal_depth_grid.style = 'display:flex; flex-direction:row; align-content:space-around'
	extremal_depth_grid.appendChild(extremal_depth_lbl)
	extremal_depth_grid.appendChild(extremal_depth_btn)
	global.ui.extremal_depth_grid = extremal_depth_grid

	let draw_curves_btn = document.createElement('input')
	draw_curves_btn.checked   = 'true'
	draw_curves_btn.type 	  = "checkbox"
	global.ui.draw_curves_btn = draw_curves_btn

	let draw_curves_lbl = document.createElement('label')
	draw_curves_lbl.setAttribute("for", draw_curves_btn)
	draw_curves_lbl.style 	  = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:120px'
	draw_curves_lbl.innerHTML = 'Draw curves'
	global.ui.draw_curves_lbl = draw_curves_lbl

	let draw_curves_grid = document.createElement('div')
	draw_curves_grid.id    = draw_curves_grid
	draw_curves_grid.style = 'display:flex; flex-direction:row; align-content:space-around'
	draw_curves_grid.appendChild(draw_curves_lbl)
	draw_curves_grid.appendChild(draw_curves_btn)
	global.ui.draw_curves_grid = draw_curves_grid

	let ed_draw_outliers_btn = document.createElement('input')
	ed_draw_outliers_btn.type 	   = "checkbox"
	global.ui.ed_draw_outliers_btn = ed_draw_outliers_btn

	let ed_draw_outliers_lbl = document.createElement('label')
	ed_draw_outliers_lbl.setAttribute("for", ed_draw_outliers_btn)
	ed_draw_outliers_lbl.style 	   = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:160px;'
	ed_draw_outliers_lbl.innerHTML = '- Draw outliers'
	global.ui.ed_draw_outliers_lbl = ed_draw_outliers_lbl

	let ed_draw_outliers_grid = document.createElement('div')
	ed_draw_outliers_grid.id    = ed_draw_outliers_grid
	ed_draw_outliers_grid.style = 'display:flex; flex-direction:row; align-content:space-around;' //justify-content:flex-end'
	ed_draw_outliers_grid.appendChild(ed_draw_outliers_lbl)
	ed_draw_outliers_grid.appendChild(ed_draw_outliers_btn)
	global.ui.ed_draw_outliers_grid = ed_draw_outliers_grid

	let create_curve_density_matrix_btn = document.createElement('input')
	global.ui.create_curve_density_matrix_btn = create_curve_density_matrix_btn
	create_curve_density_matrix_btn.type 	  = "checkbox"
	install_event_listener(create_curve_density_matrix_btn, 'click', create_curve_density_matrix_btn, EVENT.BUILD_CURVES_DENSITY_MATRIX)

	let create_curve_density_matrix_lbl = document.createElement('label')
	create_curve_density_matrix_lbl.setAttribute("for", create_curve_density_matrix_btn)
	global.ui.create_curve_density_matrix_lbl = create_curve_density_matrix_lbl
	create_curve_density_matrix_lbl.style 	  = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:120px'
	create_curve_density_matrix_lbl.innerHTML = 'DenseLines'

	let create_curve_density_matrix_resolution = document.createElement('input')
	global.ui.create_curve_density_matrix_resolution = create_curve_density_matrix_resolution
	create_curve_density_matrix_resolution.value 	 = "32"
	create_curve_density_matrix_resolution.style 	 = "position:relative; width:35; margin:2px"

	let create_curve_density_matrix_grid = document.createElement('div')
	global.ui.create_curve_density_matrix_grid = create_curve_density_matrix_grid
	create_curve_density_matrix_grid.id 	   = create_curve_density_matrix_grid
	create_curve_density_matrix_grid.style 	   =
	create_curve_density_matrix_grid.appendChild(create_curve_density_matrix_lbl)
	create_curve_density_matrix_grid.appendChild(create_curve_density_matrix_btn)
	create_curve_density_matrix_grid.appendChild(create_curve_density_matrix_resolution)

	let controls = get_component("controls");
	if (controls) {
		controls.appendChild(stats_section_lbl)
		controls.appendChild(stats_grid)
		controls.appendChild(get_stats_ranks_btn)
		controls.appendChild(pos_section_lbl)
		controls.appendChild(pos_grid)
		controls.appendChild(min_gp_lbl)
		controls.appendChild(min_gp_sld)
		controls.appendChild(min_gp_val)
		controls.appendChild(modified_band_depth_grid)
		controls.appendChild(mbd_draw_outliers_grid)
		controls.appendChild(extremal_depth_grid)
		controls.appendChild(ed_draw_outliers_grid)
		controls.appendChild(draw_curves_grid)
		controls.appendChild(create_curve_density_matrix_grid)
	}

	//----------
	// default table components
	//----------

	let st_filter_input = document.createElement('input')
	st_filter_input.setAttribute("type","text")
	st_filter_input.id    	   = 'st_filter_input'
	st_filter_input.style 	   = 'position:relative; width:98%; margin-left:3px; margin-bottom:3px; margin-top:3px\
	 						  overflow:auto; border-radius:2px; background-color:#FFFFFF;font-family:Courier; font-size:14pt;'

	global.ui.st_filter_input = st_filter_input
	install_event_listener(st_filter_input, 'change', st_filter_input, EVENT.FILTER)

	let st_add_table_symbols_btn = document.createElement('button')
	global.ui.st_add_table_symbols_btn   = st_add_table_symbols_btn
	st_add_table_symbols_btn.id 		  = "st_add_table_symbols_btn"
	st_add_table_symbols_btn.textContent = 'add curves on table'
	st_add_table_symbols_btn.style 	  = "position:relative; width:98%; margin-left:3px; margin-bottom:3px;\
	 								   	 border-radius:13px; background-color:#AAAAAA; font-family:Courier; font-size:12pt;"
	install_event_listener(st_add_table_symbols_btn, 'click', st_add_table_symbols_btn, EVENT.ADD_TABLE_SYMBOLS)

	let st_toggle_table_btn = document.createElement('button')
	global.ui.st_toggle_table_btn    = st_toggle_table_btn
	st_toggle_table_btn.id 		  = "st_toggle_table_btn"
	st_toggle_table_btn.textContent  = 'toggle full table'
	st_toggle_table_btn.style 	  	  = "position:relative; width:98%; margin-top:3px; margin-left:3px; margin-bottom:3px;\
	 								   	 border-radius:13px; background-color:#AAAAAA; font-family:Courier; font-size:12pt;"
	install_event_listener(st_toggle_table_btn, 'click', st_toggle_table_btn, EVENT.TOGGLE_TABLE)

	let symbols_table_div = document.createElement('div')
	global.ui.symbols_table_div = symbols_table_div
	symbols_table_div.id 		= 'symbols_table_div'
	symbols_table_div.style 	= 'position:relative; width:98%; height:80%; margin:auto;\
	 							   overflow:auto; border-radius:2px; background-color:#FFFFFF'

	let table_component = get_component("table");
	if (table_component) {
		table_component.appendChild(st_filter_input);
		table_component.appendChild(st_add_table_symbols_btn);
		table_component.appendChild(symbols_table_div);
		table_component.appendChild(st_toggle_table_btn);
	}

	//----------
	// creating table for players (symbols)
	//----------
	let symbols_table = symbols_table_div.appendChild(document.createElement('table'))
	global.ui.symbols_table = symbols_table
	symbols_table.style 	= 'position:block; width:100%; heigth: 100% !important;'
	for (let i=0;i<global.symbols.length;i++) {
		let symbol = global.symbols[i]
		let row    = symbols_table.appendChild(document.createElement('tr'))
		let col    = row.appendChild(document.createElement('td'))

		col.innerText 		 = symbol.name
		col.style 			 = "cursor: pointer"
		col.style.fontFamily = 'Courier'
		col.style.fontSize 	 = '14pt'
		col.style.color 	 = "#6b6f71"

		symbol.ui_row = row
		symbol.ui_col = col
		install_event_listener(symbol.ui_col, 'click', symbol, EVENT.TOGGLE_SYMBOL)
	}

	//----------
	// full table components
	//----------

	let ft_position_section_label = create_section_label('Positions');

	let ft_g_btn = create_checkbox(undefined, 'G');
	ft_g_btn.id = 'ft_g_btn';
	ft_g_btn.style = 'position:relative; vertical-align:middle;';
	ft_g_btn.className = 'ft-pos-filter'
	install_event_listener(ft_g_btn, 'click', ft_g_btn, EVENT.FILTER_FT_BY_POS)
	let ft_g_lbl = create_checkbox_label(ft_g_btn, 'Guard');
	ft_g_lbl.style.setProperty('position','relative')

	let ft_f_btn = create_checkbox(undefined, 'F');
	ft_f_btn.id = 'ft_f_btn';
	ft_f_btn.style = 'position:relative; vertical-align:middle; left:15';
	ft_f_btn.className = 'ft-pos-filter'
	install_event_listener(ft_f_btn, 'click', ft_f_btn, EVENT.FILTER_FT_BY_POS)
	let ft_f_lbl = create_checkbox_label(ft_f_btn, 'Forward');
	ft_f_lbl.style.setProperty('position','relative')
	ft_f_lbl.style.setProperty('left','15')

	let ft_c_btn = create_checkbox(undefined, 'C');
	ft_c_btn.id = 'ft_c_btn';
	ft_c_btn.style = 'position:relative; vertical-align:middle; left:30';
	ft_c_btn.className = 'ft-pos-filter'
	install_event_listener(ft_c_btn, 'click', ft_c_btn, EVENT.FILTER_FT_BY_POS)
	let ft_c_lbl = create_checkbox_label(ft_c_btn, 'Center');
	ft_c_lbl.style.setProperty('position','relative')
	ft_c_lbl.style.setProperty('left','30')

	let ft_position_filters_div = document.createElement('div');
	ft_position_filters_div.style = 'position:relative;'
	ft_position_filters_div.appendChild(ft_g_lbl);
	ft_position_filters_div.appendChild(ft_g_btn);
	ft_position_filters_div.appendChild(ft_f_lbl);
	ft_position_filters_div.appendChild(ft_f_btn);
	ft_position_filters_div.appendChild(ft_c_lbl);
	ft_position_filters_div.appendChild(ft_c_btn);

	let ft_position_section_div = document.createElement('div')
	ft_position_section_div.style = 'position:relative; width:30%'
	ft_position_section_div.appendChild(ft_position_section_label);
	ft_position_section_div.appendChild(ft_position_filters_div);

	let ft_stats_section_lbl = create_section_label('Stats');

	let stats_radio_totals = document.createElement('input');
	stats_radio_totals.name = "stats_type";
	stats_radio_totals.type = "radio";
	stats_radio_totals.value = "totals";
	stats_radio_totals.checked = true;
	stats_radio_totals.style.setProperty("vertical-align","middle");
	install_event_listener(stats_radio_totals, 'click', stats_radio_totals, EVENT.SWITCH_FT_STAT_TYPE);

	let stats_radio_totals_lbl = create_checkbox_label(stats_radio_totals, 'Totals');

	let stats_radio_pg = document.createElement('input');
	stats_radio_pg.name = "stats_type";
	stats_radio_pg.type = "radio";
	stats_radio_pg.value = "pg";
	stats_radio_pg.style.setProperty("vertical-align","middle");
	stats_radio_pg.style.setProperty("position","relative");
	stats_radio_pg.style.setProperty("left","15");
	install_event_listener(stats_radio_pg, 'click', stats_radio_pg, EVENT.SWITCH_FT_STAT_TYPE);

	let stats_radio_pg_lbl = create_checkbox_label(stats_radio_pg, 'Per Game');
	stats_radio_pg_lbl.style.setProperty("position","relative");
	stats_radio_pg_lbl.style.setProperty("left","15");

	let stats_radio_div = document.createElement('div');
	stats_radio_div.style = "position:relative;";
	stats_radio_div.append(stats_radio_totals_lbl)
	stats_radio_div.append(stats_radio_totals)
	stats_radio_div.append(stats_radio_pg_lbl)
	stats_radio_div.append(stats_radio_pg)

	let ft_stats_section_div = document.createElement('div');
	ft_stats_section_div.style = 'position:relative; width:22%; margin-left:20';
	ft_stats_section_div.appendChild(ft_stats_section_lbl);
	ft_stats_section_div.appendChild(stats_radio_div);

	let ft_others_filters_lbl = create_section_label('Other filters');

	let protos_only_btn = create_checkbox();
	protos_only_btn.id = 'protos_only_checkbox';
	protos_only_btn.style = 'vertical-align:middle;';
	install_event_listener(protos_only_btn, 'click', protos_only_btn, EVENT.FULL_TABLE_PROTOS_ONLY)

	let protos_only_lbl = create_checkbox_label(protos_only_btn, 'prototypes');

	let selected_only_btn = create_checkbox();
	selected_only_btn.id = 'selected_only_checkbox';
	selected_only_btn.style = 'position:relative; left:15; vertical-align:middle;';
	install_event_listener(selected_only_btn, 'click', selected_only_btn, EVENT.FULL_TABLE_SELECTED_ONLY)

	let selected_only_lbl = create_checkbox_label(selected_only_btn, 'selected');
	selected_only_lbl.style.setProperty("position","relative");
	selected_only_lbl.style.setProperty("left","15");

	let ft_others_filters_div = document.createElement('div');
	ft_others_filters_div.style = 'position;relative'
	ft_others_filters_div.appendChild(protos_only_lbl);
	ft_others_filters_div.appendChild(protos_only_btn);
	ft_others_filters_div.appendChild(selected_only_lbl);
	ft_others_filters_div.appendChild(selected_only_btn);

	let ft_others_section_div = document.createElement('div');
	ft_others_section_div.style = 'position:relative; width:30%; margin-left:20'
	ft_others_section_div.appendChild(ft_others_filters_lbl);
	ft_others_section_div.appendChild(ft_others_filters_div);

	let ft_controls_div = document.createElement('div');
	ft_controls_div.style = 'position:relative; display:flex; flex-direction:row; margin-bottom:5'
	ft_controls_div.appendChild(ft_position_section_div);
	ft_controls_div.appendChild(ft_stats_section_div);
	ft_controls_div.appendChild(ft_others_section_div);

	let ft_filter_input = document.createElement('input')
	ft_filter_input.setAttribute("type","text")
	ft_filter_input.id    = 'ft_filter_input'
	ft_filter_input.style = 'position:relative; width:98%;\
	 						 overflow:auto; border-radius:2px; background-color:#FFFFFF;font-family:Courier; font-size:14pt;'

	global.ui.ft_filter_input = ft_filter_input
	install_event_listener(ft_filter_input, 'change', ft_filter_input, EVENT.FILTER)

	let full_table_div 		 = document.createElement('div')
	global.ui.full_table_div = full_table_div
	full_table_div.id 	     = 'full_table_div'
	full_table_div.style 	 = 'position:relative; width:98%; height:80%;\
	 							overflow:auto; border-radius:2px; background-color:#FFFFFF'

	let ft_default_sort_select = document.createElement('select');
	ft_default_sort_select.id = 'ft_default_sort_select';
	ft_default_sort_select.style = 'position:relative; background-color:#2f3233; width:225px; \
								    font-family:Courier; font-size:13pt; color: #FFFFFF;z-index:2;'
	install_event_listener(ft_default_sort_select, 'change', ft_default_sort_select, EVENT.CHANGE_FT_DEFAULT_SORT);

	let ft_default_sort_lbl = create_checkbox_label(ft_default_sort_select, 'Default sorting method:');

	let mcdf_option = create_option('mcdf', 'distance to max cdf');
	mcdf_option.selected = 'selected';
	let lex_option  = create_option('lex','lexicographic');

	ft_default_sort_select.appendChild(mcdf_option);
	ft_default_sort_select.appendChild(lex_option);

	let ft_default_sort_div = document.createElement('div')
	ft_default_sort_div.style = 'position:relative; display:flex; flex-direction:row';
	ft_default_sort_div.appendChild(ft_default_sort_lbl);
	ft_default_sort_div.appendChild(ft_default_sort_select);

	let full_table_component = get_component("full_table");
	if (full_table_component) {
		full_table_component.appendChild(ft_controls_div);
		full_table_component.appendChild(ft_filter_input);
		full_table_component.appendChild(full_table_div);
		full_table_component.appendChild(ft_default_sort_div);
	}

	// -------
	// groups table components
	// -------

	let groups_table_div 	   = document.createElement('div')
	global.ui.groups_table_div = groups_table_div
	groups_table_div.id 	   = 'group_table_div'
	groups_table_div.style 	   = 'position:relative; width:98%; height:80%; margin:auto;\
	 							  overflow:auto; border-radius:2px; background-color:#FFFFFF'

	let groups_table_component = get_component("groups_table");
	if (groups_table_component) {
		groups_table_component.appendChild(groups_table_div);
	}

	// -------
	// VIEWS
	// -------

	// -------
	// line_chart components
	// -------

	//----------
	// select to control which stat appears on main view
	//----------
	let chosen_stats_select = document.createElement('select')
	global.ui.chosen_stats_select = chosen_stats_select
	chosen_stats_select.style 	  = 'background-color:#2f3233; position:relative; left:55; top:0.5%; width:125px; height:25px;\
									 font-family:Courier; font-size:13pt; color: #FFFFFF;z-index:2;'

	//----------
	// button to reset all views
	//----------
	let clear_chart_btn = document.createElement('button')
	global.ui.clear_chart_btn 	= clear_chart_btn
	clear_chart_btn.id 			= "clear_chart_btn"
	clear_chart_btn.textContent = 'clear chart'
	clear_chart_btn.style 		= "position:relative; left:calc( 100% - 270px ); top:0.5%; margin:2px; border-radius:13px; background-color:#AAAAAA;\
								   font-family:Courier; font-size:12pt; z-index:2;"
	install_event_listener(clear_chart_btn, 'click', clear_chart_btn, EVENT.CLEAR_CHART)

	let line_chart_controls_div = document.createElement('div');
	line_chart_controls_div.appendChild(chosen_stats_select);
	line_chart_controls_div.appendChild(clear_chart_btn);

	// -------
	// div for lc_canvas
	// -------
	let line_chart_canvas_div = document.createElement('div');
	global.ui.line_chart_canvas_div = line_chart_canvas_div;
	line_chart_canvas_div.id = 'line_chart_canvas_div';
	line_chart_canvas_div.style = 'height:calc( 100% - 29px );'


	let line_chart = get_component("line_chart");
	if (line_chart) {
		line_chart.appendChild(line_chart_controls_div)
		line_chart.appendChild(line_chart_canvas_div)

		//----------
		// canvas to capture events on line chart
		//----------
		let lc_canvas = line_chart_canvas_div.appendChild(document.createElement('canvas'));
		global.ui.lc_canvas = lc_canvas;
		lc_canvas.style		= 'position:relative; left:0px; top:0px; z-index:1;';
		lc_canvas.id 		= 'lc_canvas';
		lc_canvas.tabindex 	= '1';
		install_event_listener(lc_canvas, "mousemove", lc_canvas, EVENT.MOUSEMOVE)
		install_event_listener(lc_canvas, "wheel", lc_canvas, EVENT.MOUSEWHEEL)
		install_event_listener(lc_canvas, "mousedown", lc_canvas, EVENT.MOUSEDOWN)
		install_event_listener(lc_canvas, "mouseup", lc_canvas, EVENT.MOUSEUP)
		install_event_listener(lc_canvas, "dblclick", lc_canvas, EVENT.DBCLICK)
		install_event_listener(lc_canvas, "click", lc_canvas, EVENT.CLICK)

	}


	// -------
	// aux_view components
	// -------

	//----------
	// select between rank cdf and extremal depth cdf
	//----------
	let rank_depth_select = document.createElement('select')
	global.ui.rank_depth_select = rank_depth_select
	rank_depth_select.style 	= 'position:relative; left:20; top:0%; background-color:#2f3233; \
								   font-family:Courier; font-size:13pt; color: #FFFFFF;z-index:2;'
	install_event_listener(rank_depth_select, 'change', rank_depth_select, EVENT.CHANGE_AUX_VIEW)

	let hidden_option = create_option('none','aux view')
	hidden_option.selected = 'selected'
	hidden_option.hidden   = 'hidden'

	let dcdf_option = create_option('dcdf', 'pw depth distribution')
	let rcdf_option = create_option('rcdf','rank distribution')
	let none_option = create_option('none', 'none')

	rank_depth_select.appendChild(hidden_option)
	rank_depth_select.appendChild(dcdf_option)
	rank_depth_select.appendChild(rcdf_option)
	rank_depth_select.appendChild(none_option)

	//----------
	// option to choose aggregated or separated distributions
	//----------
	let agg_sep_select = document.createElement('select');
	global.ui.agg_sep_select = agg_sep_select;
	agg_sep_select.style 	 = 'position:relative; left:25; top:0%; background-color:#2f3233; \
								font-family:Courier; font-size:13pt; color: #FFFFFF;z-index:2;'

	let agg_option = create_option('agg', 'aggregated');
	agg_option.selected = 'selected';
	let sep_option = create_option('sep', 'separated');

	agg_sep_select.appendChild(agg_option);
	agg_sep_select.appendChild(sep_option);

	let aux_view_controls_topdiv = document.createElement('div')
	aux_view_controls_topdiv.appendChild(rank_depth_select);
	aux_view_controls_topdiv.appendChild(agg_sep_select);

	// -------
	// div for ac_canvas
	// -------
	let aux_view_canvas_div = document.createElement('div');
	global.ui.aux_view_canvas_div = aux_view_canvas_div;
	aux_view_canvas_div.id = 'aux_view_canvas_div';
	aux_view_canvas_div.style = 'height: calc( 100% - 58px )'

	//----------
	// checkbox to draw group envelopes
	//----------
	let draw_groups_envelope_btn = create_checkbox();
	draw_groups_envelope_btn.style = 'position:relative; left:20; top:calc ( 100% - 29px ); vertical-align:middle;'
	global.ui.draw_groups_envelope_btn = draw_groups_envelope_btn;

	let draw_groups_envelope_lbl = create_checkbox_label(draw_groups_envelope_btn, 'envelopes');
	draw_groups_envelope_lbl.style.setProperty('position','relative')
	draw_groups_envelope_lbl.style.setProperty('left','15')
	draw_groups_envelope_lbl.style.setProperty('top','calc ( 100% - 29px )')
	global.ui.draw_groups_envelope_lbl = draw_groups_envelope_lbl

	//----------
	// select number of group prototypes to be shown in envelope (besides top and bottom ones)
	//----------
	let n_protos_select = document.createElement('select');
	global.ui.n_protos_select = n_protos_select;
	n_protos_select.style 	  = 'position:relative; left:20; top:calc ( 100% - 29px ); width:110px; background-color:#2f3233; \
								 font-family:Courier; font-size:13pt; color: #FFFFFF;z-index:2;'

	let n_protos_info_option = create_option(1, 'n_protos');
	n_protos_info_option.selected = 'selected';
	n_protos_info_option.hidden   = 'hidden';

	let n_protos_1_option = create_option(1,'1');
	let n_protos_2_option = create_option(2,'2');
	let n_protos_3_option = create_option(3,'3');

	n_protos_select.appendChild(n_protos_info_option);
	n_protos_select.appendChild(n_protos_1_option);
	n_protos_select.appendChild(n_protos_2_option);
	n_protos_select.appendChild(n_protos_3_option);

	//----------
	// select step size
	//----------
	let step_select = document.createElement('select');
	global.ui.step_select = step_select;
	step_select.style 	  = 'position:relative; left:40; top:calc ( 100% - 29px ); width:140px; background-color:#2f3233; \
							 font-family:Courier; font-size:13pt; color: #FFFFFF;z-index:2;'

	let step_default_option = create_option(1,'default(1)');
	step_default_option.selected = 'selected';

	let step_3_option  = create_option(3,'3');
	let step_5_option  = create_option(5,'5');
	let step_10_option = create_option(10,'10');

	step_select.appendChild(step_default_option);
	step_select.appendChild(step_3_option);
	step_select.appendChild(step_5_option);
	step_select.appendChild(step_10_option);

	let aux_view_controls_botdiv = document.createElement('div')
	aux_view_controls_botdiv.appendChild(draw_groups_envelope_lbl);
	aux_view_controls_botdiv.appendChild(draw_groups_envelope_btn);
	aux_view_controls_botdiv.appendChild(n_protos_select);
	aux_view_controls_botdiv.appendChild(step_select);

	let aux_view = get_component('aux_view');
	if (aux_view) {
		aux_view.appendChild(aux_view_controls_topdiv)
		aux_view.appendChild(aux_view_canvas_div)
		aux_view.appendChild(aux_view_controls_botdiv)
		// aux_view.appendChild(step_select)

		//----------
		// canvas to capture events on aux view
		//----------
		let av_canvas = aux_view_canvas_div.appendChild(document.createElement('canvas'));
		global.ui.av_canvas = av_canvas;
		av_canvas.style		= 'position:relative; left:0px; top:0px; z-index:1;';
		av_canvas.id 		= 'av_canvas';
		av_canvas.tabindex 	= '1';
		install_event_listener(av_canvas, "mousemove", av_canvas, EVENT.MOUSEMOVE)
		install_event_listener(av_canvas, "mousedown", av_canvas, EVENT.MOUSEDOWN)
		install_event_listener(av_canvas, "mouseup", av_canvas, EVENT.MOUSEUP)

	}

	// -------
	// projection view components
	// -------

	//----------
	// select colorby
	//----------
	let proj_colorby_select = document.createElement('select')
	global.ui.proj_colorby_select = proj_colorby_select
	proj_colorby_select.style 	  = 'position:absolute; left:15; top:0%; width:145px; background-color:#2f3233; \
									 font-family:Courier; font-size:13pt; color: #FFFFFF;z-index:2;'
	install_event_listener(proj_colorby_select, 'change', proj_colorby_select, EVENT.CHANGE_COLORBY)

	let proj_colorby_info_option = create_option('default', 'color by');
	proj_colorby_info_option.selected = 'selected';
	proj_colorby_info_option.hidden   = 'hidden';

	let proj_colorby_default_option 	= create_option('default', 'default')
	let proj_colorby_position_option 	= create_option('position','position')
	let proj_colorby_gamesplayed_option = create_option('games_played', 'games played')

	proj_colorby_select.appendChild(proj_colorby_info_option)
	proj_colorby_select.appendChild(proj_colorby_default_option)
	proj_colorby_select.appendChild(proj_colorby_position_option)
	proj_colorby_select.appendChild(proj_colorby_gamesplayed_option)

	//----------
	// select number of clusters and cluster button
	//----------
	let n_clusters_select = document.createElement('select')

	global.ui.n_clusters_select = n_clusters_select
	n_clusters_select.style 	= 'position:relative; left:175; top:0%; width:130px; background-color:#2f3233; \
								   font-family:Courier; font-size:13pt; color: #FFFFFF;z-index:2;'

	let df_option = create_option(0, 'n_clusters');
	df_option.selected = 'selected';
	df_option.hidden   = 'hidden';

	let five_option   = create_option(5, '5');
	let seven_option  = create_option(7, '7');
	let ten_option    = create_option(10, '10');
	let twelve_option = create_option(12, '12');

	n_clusters_select.appendChild(df_option);
	n_clusters_select.appendChild(five_option);
	n_clusters_select.appendChild(seven_option);
	n_clusters_select.appendChild(ten_option);
	n_clusters_select.appendChild(twelve_option);

	let cluster_btn = document.createElement('button')
	global.ui.cluster_btn 	= cluster_btn
	cluster_btn.id 			= "cluster_btn"
	cluster_btn.textContent = 'cluster'
	cluster_btn.style 		= "position:relative; left:175; top:0%; margin:2px; border-radius:13px; background-color:#AAAAAA;\
							   font-family:Courier; font-size:12pt; z-index:2;"
	install_event_listener(cluster_btn, 'click', cluster_btn, EVENT.CLUSTER)

	let projection_controls_topdiv = document.createElement('div')
	projection_controls_topdiv.style.setProperty('display','inline-block')
	projection_controls_topdiv.appendChild(proj_colorby_select)
	projection_controls_topdiv.appendChild(n_clusters_select)
	projection_controls_topdiv.appendChild(cluster_btn)

	// -------
	// div for p_canvas
	// -------
	let projection_canvas_div = document.createElement('div')
	global.ui.projection_canvas_div = projection_canvas_div;
	projection_canvas_div.id = 'projection_canvas_div';
	projection_canvas_div.style = 'height: calc( 100% - 29px )'

	//----------
	// button to create group with current selection
	//----------
	let create_group_btn = document.createElement('button')
	global.ui.create_group_btn 	 = create_group_btn
	create_group_btn.id 		 = "create_group_btn"
	create_group_btn.textContent = 'create group'
	create_group_btn.style 		 = "position:relative; left:15; top:0%; margin:2px; border-radius:13px; background-color:#AAAAAA;\
									font-family:Courier; font-size:12pt; z-index:2;"
	install_event_listener(create_group_btn, 'click', create_group_btn, EVENT.CREATE_GROUP)

	//----------
	// button to reset all current groups
	//----------
	let reset_groups_btn = document.createElement('button')
	global.ui.reset_groups_btn   = reset_groups_btn
	reset_groups_btn.id 	   	 = "reset_groups_btn"
	reset_groups_btn.textContent = 'reset groups'
	reset_groups_btn.style 		 = "position:relative; left:20; top:0%; margin:2px; border-radius:13px; background-color:#AAAAAA;\
									font-family:Courier; font-size:12pt; z-index:2;"
	install_event_listener(reset_groups_btn, 'click', reset_groups_btn, EVENT.REMOVE_ACTIVE_GROUPS)

	let projection_controls_botdiv = document.createElement('div')
	projection_controls_botdiv.style.setProperty('display','inline-block')
	projection_controls_botdiv.appendChild(create_group_btn)
	projection_controls_botdiv.appendChild(reset_groups_btn)

	let projection = get_component("projection");
	if (projection) {
		projection.appendChild(projection_controls_topdiv)
		projection.appendChild(projection_canvas_div)
		projection.appendChild(projection_controls_botdiv)
		// projection.appendChild(create_group_btn)
		// projection.appendChild(reset_groups_btn)

		//----------
		// canvas to capture events on visualizations
		//----------
		let p_canvas = projection_canvas_div.appendChild(document.createElement('canvas'));
		global.ui.p_canvas  = p_canvas;
		p_canvas.style		= 'position:relative; left:0px; top:0px; z-index:1;';
		p_canvas.id 		= 'p_canvas';
		p_canvas.tabindex 	= '1';
		install_event_listener(p_canvas, "mousemove", p_canvas, EVENT.MOUSEMOVE)
		install_event_listener(p_canvas, "wheel", p_canvas, EVENT.MOUSEWHEEL)
		install_event_listener(p_canvas, "mousedown", p_canvas, EVENT.MOUSEDOWN)
		install_event_listener(p_canvas, "mouseup", p_canvas, EVENT.MOUSEUP)
		install_event_listener(p_canvas, "dblclick", p_canvas, EVENT.DBCLICK)
		install_event_listener(p_canvas, "click", p_canvas, EVENT.CLICK)

	}

	//----------
	// general div and body
	//----------
	// let main_div = document.createElement('div')
	// global.ui.main_div = main_div
	// main_div.id 	   = 'main_div'
	// main_div.style 	   = 'position:absolute; width:100%; height:100%; display:grid;\
	// 					  grid-template-columns:250px auto; grid-template-rows:100%; grid-column-gap:10px;'
	// main_div.appendChild(left_panel)
	// main_div.appendChild(ts_div)

	var body = document.getElementsByTagName('body')[0]
	global.ui.body = body
	// body.style 	   = 'margin:0px 2px 2px 0px; background-color:#2f3233'

	install_event_listener(window, "keydown", window, EVENT.KEYDOWN)

}

function grow_heap() {
	// console.log("starting grow heap function")
	let old_heap_size = global.tsvis_wasm_module.exports.memory.buffer.byteLength
	global.tsvis_wasm_module.exports.memory.grow(old_heap_size/65536)
	let new_heap_size = global.tsvis_wasm_module.exports.memory.buffer.byteLength
	// console.log(`heap grew from ${old_heap_size} to ${new_heap_size}`)
	global.tsvis_wasm_module.exports.tsvis_heap_grow(new_heap_size)
	// console.log(`success`)
}

function heap_log() {
	let heap_size = global.tsvis_wasm_module.exports.tsvis_heap_size()
	let heap_used = global.tsvis_wasm_module.exports.tsvis_heap_used()
	let heap_free = global.tsvis_wasm_module.exports.tsvis_heap_free()

	console.log(`heap size: ${heap_size} // heap used: ${heap_used} // heap free: ${heap_free}`)
}

function run_modified_band_depth_algorithm() {

	if (global.chart_symbols.length == 0) {
		window.alert("No symbols selected!")
		global.ui.modified_band_depth_btn.setAttribute("checked","false")
		return
	}

	global.modified_band_depth.ranked_symbols = []

	let n = global.chart_symbols.length

	let symbols_mbd = []

	let mem_checpoint_raw_p = global.tsvis_wasm_module.exports.tsvis_mem_get_checkpoint()

	let curve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_CurveList_new(n)
	while (curve_list_raw_p == 0) {
		grow_heap()
		curve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_CurveList_new(n)
	}

	for (let i=0;i<n;i++) {
		let symbol = global.chart_symbols[i]
		let ts_current_values = symbol.ts_current_values
		if (ts_current_values == null) {
			// console.log("Discarding symbol ", symbol.name, " on modified band depth computation")
		}
		symbols_mbd.push(symbol)

		let m = ts_current_values.length
		let curve_raw_p  = global.tsvis_wasm_module.exports.tsvis_Curve_new(m)
		while (curve_raw_p == 0) {
			grow_heap()
			curve_raw_p = global.tsvis_wasm_module.exports.tsvis_Curve_new(m)
		}

		let values_raw_p = global.tsvis_wasm_module.exports.tsvis_Curve_values(curve_raw_p)
		const c_curve_values = new Float64Array(global.tsvis_wasm_module.exports.memory.buffer, values_raw_p, m);

		c_curve_values.set(ts_current_values)

		let ok = global.tsvis_wasm_module.exports.tsvis_CurveList_append(curve_list_raw_p, curve_raw_p)
	}

	let mbd_raw_p = global.tsvis_wasm_module.exports.mbd_modified_band_depth_run(curve_list_raw_p)
	while (mbd_raw_p == 0) {
		grow_heap()
		mbd_raw_p = global.tsvis_wasm_module.exports.mbd_modified_band_depth_run(curve_list_raw_p)
	}

	let rank_raw_p = global.tsvis_wasm_module.exports.mbd_get_modified_band_depth_rank_(mbd_raw_p)
	const rank = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, rank_raw_p, symbols_mbd.length);

	for (let i=0;i<symbols_mbd.length;i++) {
		let symbol_rank_i = symbols_mbd[rank[i]]
		symbol_rank_i.mbd_rank = i
		global.modified_band_depth.ranked_symbols.push(symbol_rank_i)
	}

	prepare_fb_inner_band("mbd")
	prepare_fb_outer_band("mbd")
	prepare_fb_outliers("mbd")

	global.tsvis_wasm_module.exports.tsvis_mem_set_checkpoint(mem_checpoint_raw_p)

	//--------------
	// sort symbols by mbd_rank
	//--------------
	global.symbols.sort((a,b) => {
		if (a.mbd_rank != null && b.mbd_rank != null) {
			return a.mbd_rank - b.mbd_rank
		} else if (a.mbd_rank != null) {
			return -1
		} else if (b.mbd_rank != null ) {
			return 1
		} else {
			return -1
		}
	})
	let parent = global.ui.symbols_table
	while (parent.firstChild) {
	    parent.firstChild.remove();
	}
	for (let i=0;i<global.symbols.length;i++) {
		let symbol = global.symbols[i]
		global.ui.symbols_table.appendChild(symbol.ui_row)
	}
}

function get_gp(symbol) {
	return Object.keys(symbol.data).length;
}

function get_stats_ranks()
{

	if (global.chart_symbols.length == 0) {
		window.alert("No players selected!");
		return;
	}

	let n = global.chart_symbols.length;

	let symbols_ranks = [];

	let mem_checpoint_raw_p = global.tsvis_wasm_module.exports.tsvis_mem_get_checkpoint();

	let mcurve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_MCurveList_new(n);
	while (mcurve_list_raw_p == 0) {
		grow_heap();
		mcurve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_MCurveList_new(n);
	}

	let range = [1, 82]
	let p = range[1];
	let s = global.chosen_stats.length;

	for (let i=0; i<n; i++) {
		let symbol = global.chart_symbols[i];
		let values = [];

		for (let j=range[0]; j<=range[1]; j++) {
			if (j in symbol.data) {
				for (let k=0; k<s; k++) {
					values.push(symbol.data[j][global.chosen_stats[k]]);
				}
			} else {
				for (let k=0; k<s; k++) {
					values.push(0);
				}
			}
		}

		symbols_ranks.push(symbol);

		let mcurve_raw_p  = global.tsvis_wasm_module.exports.tsvis_MCurve_new(p,s);
		while (mcurve_raw_p == 0) {
			grow_heap();
			mcurve_raw_p = global.tsvis_wasm_module.exports.tsvis_MCurve_new(p,s);
		}

		let values_raw_p = global.tsvis_wasm_module.exports.tsvis_MCurve_values(mcurve_raw_p);

		const c_curve_values = new Float64Array(global.tsvis_wasm_module.exports.memory.buffer, values_raw_p, p*s);
		c_curve_values.set(values);

		let ok = global.tsvis_wasm_module.exports.tsvis_MCurveList_append(mcurve_list_raw_p, mcurve_raw_p);

	}

	let rcdf_raw_p = global.tsvis_wasm_module.exports.rcdf_rank_cdf_run(mcurve_list_raw_p);
	while (rcdf_raw_p == 0) {
		grow_heap();
		rcdf_raw_p = global.tsvis_wasm_module.exports.rcdf_rank_cdf_run(mcurve_list_raw_p);
	}

	let lt_matrix_raw_p	= global.tsvis_wasm_module.exports.rcdf_get_lt_matrix(rcdf_raw_p);
	let gt_matrix_raw_p	= global.tsvis_wasm_module.exports.rcdf_get_gt_matrix(rcdf_raw_p);

	const lt_matrix = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, lt_matrix_raw_p, n * p);
	const gt_matrix = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, gt_matrix_raw_p, n * p);

	for (let i=0; i<n; i++) {
		let symbol_i  = symbols_ranks[i];
		let symbol_gp = get_gp(symbol_i);

		let lt_ranks = [];
		let gt_ranks = [];

		for (let j=0; j<p; j++) {
			let ltgt_matrix_index = (p*i)+j

			let lt_rank = lt_matrix[ltgt_matrix_index];
			let gt_rank = gt_matrix[ltgt_matrix_index];
			lt_ranks.push(lt_rank);
			gt_ranks.push(gt_rank);
		}

		let lt_ranks_dist = [];
		let gt_ranks_dist = [];
		for (let j=0; j<n; j++) {
			let count_lt_rankj = 0;
			let count_gt_rankj = 0;
			for (let k=0; k<p; k++) {
				// UPDATE 2021-04-14: check if player played game before adding its rank to the distribution
				if ((lt_ranks[k] <= j) && (k+1 in symbol_i.data)) {
					count_lt_rankj += 1;
				}

				if ((gt_ranks[k] <= j) && (k+1 in symbol_i.data)) {
					count_gt_rankj += 1;
				}
			}
			// UPDATE 2021-04-14: normalize ranks to player's # of games played

			lt_ranks_dist.push((count_lt_rankj/symbol_gp));
			gt_ranks_dist.push((count_gt_rankj/symbol_gp));

		}

		symbol_i.lt_ranks_dist = lt_ranks_dist
		symbol_i.gt_ranks_dist = gt_ranks_dist


	}

	global.tsvis_wasm_module.exports.tsvis_mem_set_checkpoint(mem_checpoint_raw_p);
}

function run_extremal_depth_algorithm()
{

	if (global.chart_symbols.length == 0) {
		window.alert("No players selected!")
		return
	}

	let n = global.chart_symbols.length

	let symbols_ed = []

	let mem_checpoint_raw_p = global.tsvis_wasm_module.exports.tsvis_mem_get_checkpoint()

	let curve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_CurveList_new(n)
	while (curve_list_raw_p == 0) {
		grow_heap()
		curve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_CurveList_new(n)
	}

	for (let i=0;i<n;i++) {
		let symbol = global.chart_symbols[i]

		let values
		if (global.ui.use_diffs_btn.checked) {
			values = symbol.ts_current_values_diffs
		} else {
			values = symbol.ts_current_values
		}

		if (values == null) {
			// console.log("Discarding symbol ", symbol.name, " on extremal depth computation")
		}
		symbols_ed.push(symbol)

		let m = values.length

		let curve_raw_p  = global.tsvis_wasm_module.exports.tsvis_Curve_new(m)
		while (curve_raw_p == 0) {
			grow_heap()
			curve_raw_p = global.tsvis_wasm_module.exports.tsvis_Curve_new(m)
		}

		let values_raw_p = global.tsvis_wasm_module.exports.tsvis_Curve_values(curve_raw_p)

		const c_curve_values = new Float64Array(global.tsvis_wasm_module.exports.memory.buffer, values_raw_p, m);
		c_curve_values.set(values)

		let ok = global.tsvis_wasm_module.exports.tsvis_CurveList_append(curve_list_raw_p, curve_raw_p)
	}

	let ed_raw_p = global.tsvis_wasm_module.exports.ed_extremal_depth_run(curve_list_raw_p)
	while (ed_raw_p == 0) {
		grow_heap()
		ed_raw_p = global.tsvis_wasm_module.exports.ed_extremal_depth_run(curve_list_raw_p)
	}

	let rank_raw_p 		 	 		= global.tsvis_wasm_module.exports.ed_get_extremal_depth_rank(ed_raw_p)
	let cdf_matrix_raw_p 	  		= global.tsvis_wasm_module.exports.ed_get_cdf_matrix(ed_raw_p)
	let lt_matrix_raw_p				= global.tsvis_wasm_module.exports.ed_get_lt_matrix(ed_raw_p)
	let gt_matrix_raw_p				= global.tsvis_wasm_module.exports.ed_get_gt_matrix(ed_raw_p)
	let n_of_pwdepth_unique_values  = global.tsvis_wasm_module.exports.ed_get_pointwise_depth_unique_values(ed_raw_p)
	let n_of_points 				= global.tsvis_wasm_module.exports.ed_get_number_of_points(ed_raw_p)

	const rank = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, rank_raw_p, symbols_ed.length);
	const cdf_matrix = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, cdf_matrix_raw_p, n * n_of_pwdepth_unique_values)
	const lt_matrix = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, lt_matrix_raw_p, n * n_of_points)
	const gt_matrix = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, gt_matrix_raw_p, n * n_of_points)

	global.extremal_depth.ranked_symbols = []
	for (let i=0;i<symbols_ed.length;i++) {
		let symbol_rank_i = symbols_ed[rank[i]]
		symbol_rank_i.ed_rank = i
		global.extremal_depth.ranked_symbols.push(symbol_rank_i)
	}

	for (let i=0;i<symbols_ed.length;i++) {
		let symbol_i = symbols_ed[i]
		let cdf_row  = []
		for (let j=0; j<n_of_pwdepth_unique_values; j++) {
			let value = cdf_matrix[(n_of_pwdepth_unique_values*i)+j] / n_of_points
			if (j % 2 == 0) {
				cdf_row.push(value)
			}
		}
		symbol_i.cdf_matrix_row = cdf_row
	}

	for (let i=0; i<symbols_ed.length; i++) {
		let symbol_i = symbols_ed[i]

		let lt_ranks = []
		let gt_ranks = []
		for (let j=0; j<n_of_points; j++) {
			let lt_rank = lt_matrix[(n*j)+i]
			let gt_rank = gt_matrix[(n*j)+i]
			lt_ranks.push(lt_rank)
			gt_ranks.push(gt_rank)
		}

		let lt_ranks_dist = []
		let gt_ranks_dist = []
		for (let j=0; j<n; j++) {
			let count_lt_rankj = 0
			let count_gt_rankj = 0
			for (let k=0; k<n_of_points; k++) {
				if (lt_ranks[k] <= j) {
					count_lt_rankj += 1
				}

				if (gt_ranks[k] <= j) {
					count_gt_rankj += 1
				}
			}
			lt_ranks_dist.push(count_lt_rankj/n_of_points)
			gt_ranks_dist.push(count_gt_rankj/n_of_points)
		}

		symbol_i.lt_ranks_dist = lt_ranks_dist
		symbol_i.gt_ranks_dist = gt_ranks_dist

	}

	//--------------
	//find values of each band (IQR and maximum non outlying envelope)
	//--------------
	prepare_fb_inner_band("ed")
	prepare_fb_outer_band("ed")
	prepare_fb_outliers("ed")

	global.tsvis_wasm_module.exports.tsvis_mem_set_checkpoint(mem_checpoint_raw_p)

	//--------------
	// sort symbols by ed_rank
	//--------------
	global.symbols.sort((a,b) => {
		if (a.ed_rank != null && b.ed_rank != null) {
			return a.ed_rank - b.ed_rank
		} else if (a.ed_rank != null) {
			return -1
		} else if (b.ed_rank != null ) {
			return 1
		} else {
			return -1
		}
	})
	let parent = global.ui.symbols_table
	while (parent.firstChild) {
	    parent.firstChild.remove();
	}
	for (let i=0;i<global.symbols.length;i++) {
		let symbol = global.symbols[i]
		global.ui.symbols_table.appendChild(symbol.ui_row)
	}

}

function run_depth_algorithm_group(group, depth_type)
{

	if (group.members.length == 0) {
		window.alert("No members!")
		return
	}

	let n = group.members.length

	let symbols = []

	let mem_checpoint_raw_p = global.tsvis_wasm_module.exports.tsvis_mem_get_checkpoint()

	let curve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_CurveList_new(n)
	while (curve_list_raw_p == 0) {
		grow_heap()
		curve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_CurveList_new(n)
	}

	for (let i=0;i<n;i++) {
		let symbol = group.members[i]
		let ts_current_values = symbol.ts_current_values
		if (ts_current_values == null) {
			// console.log("Discarding symbol ", symbol.name, " on extremal depth computation")
		}
		symbols.push(symbol)

		let m = ts_current_values.length

		let curve_raw_p  = global.tsvis_wasm_module.exports.tsvis_Curve_new(m)
		while (curve_raw_p == 0) {
			grow_heap()
			curve_raw_p = global.tsvis_wasm_module.exports.tsvis_Curve_new(m)
		}

		let values_raw_p = global.tsvis_wasm_module.exports.tsvis_Curve_values(curve_raw_p)

		const c_curve_values = new Float64Array(global.tsvis_wasm_module.exports.memory.buffer, values_raw_p, m);
		c_curve_values.set(ts_current_values)

		let ok = global.tsvis_wasm_module.exports.tsvis_CurveList_append(curve_list_raw_p, curve_raw_p)
	}

	let d_raw_p    = null
	let rank_raw_p = null
	if (depth_type == "ed") {
		d_raw_p = global.tsvis_wasm_module.exports.ed_extremal_depth_run(curve_list_raw_p)
		while (d_raw_p == 0) {
			grow_heap()
			d_raw_p = global.tsvis_wasm_module.exports.ed_extremal_depth_run(curve_list_raw_p)
		}
		rank_raw_p = global.tsvis_wasm_module.exports.ed_get_extremal_depth_rank(d_raw_p)
	} else if (depth_type == "mbd") {
		d_raw_p = global.tsvis_wasm_module.exports.mbd_modified_band_depth_run(curve_list_raw_p)
		while (d_raw_p == 0) {
			grow_heap()
			d_raw_p = global.tsvis_wasm_module.exports.mbd_modified_band_depth_run(curve_list_raw_p)
		}
		rank_raw_p = global.tsvis_wasm_module.exports.mbd_get_modified_band_depth_rank_(d_raw_p)
	}

	const rank = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, rank_raw_p, symbols.length);

	let group_depth = null
	if (depth_type == "ed") {
		group_depth = group.fbed
	} else if (depth_type == "mbd") {
		group_depth = group.fbmbd
	}

	group_depth.ranked_symbols = []
	for (let i=0;i<symbols.length;i++) {
		let symbol_rank_i = symbols[rank[i]]
		symbol_rank_i.ed_rank = i
		group_depth.ranked_symbols.push(symbol_rank_i)
	}

	//--------------
	//find values of each band (IQR and maximum non outlying envelope)
	//--------------
	prepare_fb_inner_band(depth_type, group)
	prepare_fb_outer_band(depth_type, group)
	prepare_fb_outliers(depth_type, group)

	global.tsvis_wasm_module.exports.tsvis_mem_set_checkpoint(mem_checpoint_raw_p)

}

var counter = 0
function build_curves_density_matrix() {

	let denselines_hashcode = hashcode(JSON.stringify(global.viewbox))

	if (denselines_hashcode == global.denselines.hashcode) {
		return false
	}

	global.denselines.hashcode = denselines_hashcode
	counter = counter + 1

	let mem_checpoint_raw_p = global.tsvis_wasm_module.exports.tsvis_mem_get_checkpoint()

	let n = global.chart_symbols.length

	let curve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_CurveList_new(n)
	while (curve_list_raw_p == 0) {
		grow_heap()
		curve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_CurveList_new(n)
	}

	let max_m = 0

	for (let i=0;i<n;i++) {
		let symbol = global.chart_symbols[i]
		let ts_current_values = symbol.ts_current_values

		if (ts_current_values == null) {
			// console.log("Discarding symbol ", symbol.name, " on curve density matrix building")
		}

		let m = ts_current_values.length
		max_m = Math.max(max_m, m)

		let curve_raw_p  = global.tsvis_wasm_module.exports.tsvis_Curve_new(m)
		while (curve_raw_p == 0) {
			grow_heap()
			curve_raw_p = global.tsvis_wasm_module.exports.tsvis_Curve_new(m)
		}

		let values_raw_p = global.tsvis_wasm_module.exports.tsvis_Curve_values(curve_raw_p)

		const c_curve_values = new Float64Array(global.tsvis_wasm_module.exports.memory.buffer, values_raw_p, m);

		c_curve_values.set(ts_current_values)

		let ok = global.tsvis_wasm_module.exports.tsvis_CurveList_append(curve_list_raw_p, curve_raw_p	)
	}

	let nrows 	   = global.viewbox.rows
	let ncols 	   = global.viewbox.cols
	let viewbox_x  = global.viewbox.x
	let viewbox_y  = global.viewbox.y
	let viewbox_dx = global.viewbox.width
	let viewbox_dy = global.viewbox.height

	let cdm_raw_p = global.tsvis_wasm_module.exports.curves_density_matrix(curve_list_raw_p, nrows, ncols, viewbox_x, viewbox_y, viewbox_dx, viewbox_dy)

	while (cdm_raw_p == 0) {
		grow_heap()
		cdm_raw_p = global.tsvis_wasm_module.exports.curves_density_matrix(curve_list_raw_p, nrows, ncols, viewbox_x, viewbox_y, viewbox_dx, viewbox_dy)
	}

	let cdm_entries_raw_p = global.tsvis_wasm_module.exports.matrix_get_data(cdm_raw_p)
	let cdm_entries = new Float32Array(global.tsvis_wasm_module.exports.memory.buffer, cdm_entries_raw_p, nrows*ncols)


	// normalize cdm entries
	let normalized_matrix = []
	for (let i=0;i<nrows*ncols;i++) {
		normalized_matrix.push(cdm_entries[i] / n)
	}

	global.denselines.entries = normalized_matrix

	global.tsvis_wasm_module.exports.tsvis_mem_set_checkpoint(mem_checpoint_raw_p)

	return true

}

function check_position_filters(symbol) {
	if (global.chosen_pos.length == 0) {
		return true
	} else if (symbol.position == null) {
		return true
	} else {
		if (global.chosen_pos.includes(symbol.position)) {
			return true
		} else {
			for (let i=0; i<global.chosen_pos.length; i++) {
				if (symbol.position.includes(global.chosen_pos[i])) {
					return true
				}
			}
		}
	}

	return false
}

function check_gp_filter(symbol) {
	if (symbol.data == null) {
		return true;
	} else {
		let gp = Object.keys(symbol.data).length;
		let thres = parseInt(global.min_gp_sld.value);
		if (gp >= thres) {
			return true
		} else {
			return false
		}
	}
}

function remove_element_from_list(el, lst) {
	let to_remove = global.selected_symbols.indexOf(el)
	if (to_remove > -1) {
	  lst.splice(to_remove, 1);
	}
}

const KEY_S      = 83
const KEY_E      = 69
const KEY_N      = 78
const KEY_B		 = 66
const KEY_F		 = 70
const KEY_PERIOD = 190
const KEY_COMMA  = 188
const KEY_BCKSPC = 8
const KEY_ESC	 = 27
const KEY_R 	 = 82
//--------------
//processing events as they arrive
//--------------
function process_event_queue()
{
	// process events
	for (let i=0;i<global.events.length;i++) {
		let e = global.events[i]

		if (e.event_type == EVENT.FILTER) {
			let filter_input = e.context
			let pattern = filter_input.value
			let re = new RegExp('')
			try {
				re = new RegExp(pattern);
			} catch (e) {
				console.log("invalid regular expression")
			}
			for (let i=0;i<global.symbols.length;i++) {
				let symbol = global.symbols[i]
				let found = symbol.name.search(re) >= 0
				if (found && !symbol.on_table) {
					global.ui.symbols_table.appendChild(symbol.ui_row)
					if (symbol.ft_ui_row) {
						global.ui.full_table.appendChild(symbol.ft_ui_row)
					}
					symbol.on_table = true
				} else if (!found && symbol.on_table) {
					global.ui.symbols_table.removeChild(symbol.ui_row)
					if (symbol.ft_ui_row) {
						global.ui.full_table.removeChild(symbol.ft_ui_row)
					}
					symbol.on_table = false
				}
			}
			if (filter_input.value === '') {
				if (global.ui.full_table) {
					create_and_fill_full_table_cluster(-1)
				}
			}
			console.log(pattern)
		} else if (e.event_type == EVENT.TOGGLE_SYMBOL) {
			let symbol = e.context
			let color  = pick_color()
			if (!symbol.on_chart) {
				// add symbol to chart
				add_symbol_to_chart(symbol, color)
				if (symbol.data == null) {
					download_symbol_data(symbol)
				}
			} else {
				if (e.raw.getModifierState("Shift")) {
					symbol.selected = !symbol.selected;
					if (symbol.selected) {
						global.selected_symbols.push(global.chart_symbols.indexOf(symbol));
						symbol.ui_col.style.fontWeight = 'bold';
						if (symbol.ft_ui_col) { symbol.ft_ui_col.style.fontWeight = 'bold'; }
					} else {
						remove_element_from_list(global.chart_symbols.indexOf(symbol), global.selected_symbols);
						symbol.ui_col.style.fontWeight = 'initial';
						if (symbol.ft_ui_col) { symbol.ft_ui_col.style.fontWeight = 'initial'; }
					}
				} else if (e.raw.getModifierState("Control")) {
					if (global.ref_symbol !== undefined) {
						if (global.ref_symbol !== symbol) {
							// -------
							// reset selection of current reference symbol
							// -------
							let prev_ref_sym = global.ref_symbol;
							prev_ref_sym.selected = false;
							remove_element_from_list(global.chart_symbols.indexOf(prev_ref_sym), global.selected_symbols);
							if (prev_ref_sym.ft_ui_row) {
								prev_ref_sym.ft_ui_row.style.outline = "";
								prev_ref_sym.ft_ui_row.style.border = "1px solid black";
							}

							// -------
							// update reference symbol to clicked one and show it on table
							// -------
							symbol.selected = true;
							global.selected_symbols.push(global.chart_symbols.indexOf(symbol));
							if (symbol.ft_ui_row) {
								symbol.ft_ui_row.style.border = "";
								symbol.ft_ui_row.style.outline = "3px solid white";
							}
							global.ref_symbol = symbol;
						} else {
							symbol.selected = false;
							remove_element_from_list(global.chart_symbols.indexOf(symbol), global.selected_symbols);
							if (symbol.ft_ui_row) {
								symbol.ft_ui_row.style.outline = "";
								symbol.ft_ui_row.style.border = "1px solid black";
							}
							global.ref_symbol = undefined;
						}
					} else {
						symbol.selected = true;
						global.selected_symbols.push(global.chart_symbols.indexOf(symbol));
						if (symbol.ft_ui_row) {
							symbol.ft_ui_row.style.border = "";
							symbol.ft_ui_row.style.outline = "3px solid white";
						}
						global.ref_symbol = symbol;
					}
				} else {
					remove_symbol_from_chart(symbol)
				}
			}
		} else if (e.event_type == EVENT.ADD_TABLE_SYMBOLS) {
			add_table_symbols()
		} else if (e.event_type == EVENT.CREATE_GROUP) {
			create_group()
		} else if (e.event_type == EVENT.TOGGLE_GROUP) {
			let group = e.context
			if (!group.on_chart) {
				if (e.raw.getModifierState("Control")) {
					add_group_to_chart(group)
				} else {
					for (let i=0; i<global.groups.length; i++) {
						let group_i = global.groups[i];
						if (group_i !== group) {
							remove_group_from_chart(group_i)
						}
					}
					add_group_to_chart(group)
				}
			} else {
				if (e.raw.getModifierState("Control")) {
					remove_group_from_chart(group)
					let groups_exist = false;
					for (let i=0; i<global.groups.length; i++) {
						let group = global.groups[i];
						if (group.on_chart) {
							groups_exist = true;
						}
					}
					if (!groups_exist) {
						for (let i=0; i<global.groups.length; i++) {
							let group = global.groups[i];
							add_group_to_chart(group)
						}
					}
				} else {
					for (let i=0; i<global.groups.length; i++) {
						let group_i = global.groups[i];
						if (group_i !== group) {
							remove_group_from_chart(group_i)
						}
					}
					add_group_to_chart(group)
				}
			}
		} else if (e.event_type == EVENT.REMOVE_ACTIVE_GROUPS) {
			reset_groups()
			global.layout_index = 0;
		} else if (e.event_type == EVENT.CLEAR_CHART) {
			clear_chart()
		} else if (e.event_type == EVENT.UPDATE_START_DATE) {
			let date = e.context.value
			global.date_start = date
		} else if (e.event_type == EVENT.UPDATE_END_DATE) {
			let date = e.context.value
			global.date_end = date
		} else if (e.event_type == EVENT.UPDATE_NORM_DATE) {
			let date = e.context.value
			global.date_norm = date
		} else if (e.event_type == EVENT.MOUSEMOVE) {
			global.mouse.position      = [e.raw.x, e.raw.y]
			global.mouse.last_position = global.mouse.position

			if (global.resize_target) {

				let x = e.raw.clientX
				let y = e.raw.clientY

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

		} else if (e.event_type == EVENT.KEYDOWN) {
			if(e.raw.target.id != "filter_input") {
				if (e.raw.keyCode == KEY_N) {
					global.key_update_norm = true
				} else if (e.raw.keyCode == KEY_S) {
					global.select_mode_active = true
				} else if (e.raw.keyCode == KEY_E) {
					global.key_update_end = true
				} else if (e.raw.keyCode == KEY_B){
					global.key_break = true
				} else if (e.raw.keyCode == KEY_PERIOD) {
					global.ui.create_curve_density_matrix_resolution.value = 2 * parseInt(global.ui.create_curve_density_matrix_resolution.value)
				} else if (e.raw.keyCode == KEY_COMMA) {
					global.ui.create_curve_density_matrix_resolution.value = Math.max(1, parseInt(global.ui.create_curve_density_matrix_resolution.value) / 2)
				} else if (e.raw.keyCode == KEY_BCKSPC) {
					if (global.filter_list.length > 0) {
						global.filter_list.pop()
					}
				} else if (e.raw.keyCode == KEY_ESC) {
					if (global.split_cdf.ww.length > 1) {
						global.split_cdf.breaks = [0]
						global.split_cdf.ww = [1]
						global.split_cdf.realign = []
					}
				} else if (e.raw.keyCode == KEY_F) {
					global.brush_mode_active = true
				} else if (e.raw.keyCode == KEY_R) {
					global.resize_mode_active = true
				}
			}
		} else if (e.event_type == EVENT.MOUSEWHEEL) {
			if (e.raw.deltaY > 0) {
				global.zoom = 1
				global.zoom_y = 1
				global.zoom_x = 1

				if (e.raw.getModifierState("Shift") && e.raw.getModifierState("Control")) {
					global.zoom_x = 0
				} else if (e.raw.getModifierState("Shift")) {
					global.zoom_y = 0
				}

			} else if (e.raw.deltaY < 0) {
				global.zoom = -1
				global.zoom_y = -1
				global.zoom_x = -1

				if (e.raw.getModifierState("Shift") && e.raw.getModifierState("Control")) {
					global.zoom_x = 0
				} else if (e.raw.getModifierState("Shift")) {
					global.zoom_y = 0
				}

			}
		} else if (e.event_type == EVENT.DBCLICK) {
			reset_zoom()
		} else if (e.event_type == EVENT.MOUSEDOWN) {

			//--------------
			//drawing segment filters
			//--------------
			if (e.raw.getModifierState("Shift")) {
				global.filter_state = FILTER_STATE.START
				global.filter_type  = FILTER_TYPE.BLUE
			} else if (e.raw.getModifierState("Control")) {
				global.filter_state = FILTER_STATE.START
				global.filter_type  = FILTER_TYPE.RED
			}else if (global.brush_mode_active) {
				global.drag.active = false;
				global.brush_state = BRUSH_STATE.START;
			}else if (global.select_mode_active) {
				global.select_mode_selected = true;
			}else if (global.resize_mode_active) {
				// try to find cell where mouse clicked
				let x = e.raw.clientX;
				let y = e.raw.clientY;
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

			} else {
				//--------------
				//drag
				//--------------
				global.drag.active = true
				global.drag.startpos = [e.raw.x, e.raw.y]
				global.drag.startvbox = [global.viewbox.x, global.viewbox.y]
			}

			global.split_cdf.panel_state = PANEL_STATE.START_RESIZE;

		} else if (e.event_type == EVENT.MOUSEUP) {
			global.drag.active = false;
			global.proj_drag.active = false;
			global.filter_state = FILTER_STATE.INACTIVE;

			global.split_cdf.panel_state = PANEL_STATE.INACTIVE;

			if (global.brush_mode_active) {
				global.brush_state = BRUSH_STATE.INACTIVE;
				global.brush_mode_active = false;
				global.brush = undefined;
			}

			if (global.select_mode_active) {
				global.select_mode_selected = false;
				global.select_mode_active = false;
			}

			if (global.resize_mode_active) {
				global.resize_mode_active = false
				global.resize_target = undefined
			}

		} else if (e.event_type == EVENT.RUN_EXTREMAL_DEPTH_ALGORITHM) {
			global.extremal_depth.fbplot.active = !global.extremal_depth.fbplot.active
			if (global.extremal_depth.fbplot.active) {
				run_extremal_depth_algorithm()
			}
		} else if (e.event_type == EVENT.RUN_MODIFIED_BAND_DEPTH_ALGORITHM) {
			global.modified_band_depth.fbplot.active = !global.modified_band_depth.fbplot.active
			if (global.modified_band_depth.fbplot.active) {
				run_modified_band_depth_algorithm()
			}
		} else if (e.event_type == EVENT.BUILD_CURVES_DENSITY_MATRIX) {
			global.denselines.active = !global.denselines.active
		} else if (e.event_type == EVENT.CHANGE_AUX_VIEW) {
			global.aux_view = global.ui.rank_depth_select.value
		} else if (e.event_type == EVENT.GET_STATS_RANKS) {
			get_stats_ranks()
			update_stats_ranges()
			project_chart_data()
			global.recompute_proj_viewbox = true
		} else if (e.event_type == EVENT.CLICKED_STAT) {
			if (e.context.checked) {
				global.chosen_stats.push(e.context.value)
				let option = document.createElement("option");
		    	option.value = e.context.value;
		    	option.innerHTML = e.context.value;
		    	global.ui.chosen_stats_select.appendChild(option);
				let proj_colorby_option = document.createElement("option");
		    	proj_colorby_option.value = e.context.value;
		    	proj_colorby_option.innerHTML = e.context.value;
				global.ui.proj_colorby_select.appendChild(proj_colorby_option);

			} else {
				for(let i=0; i<global.ui.chosen_stats_select.length; i++) {
					if (global.ui.chosen_stats_select.options[i].value == e.context.value) {
						global.ui.chosen_stats_select.remove(i);
					}
				}
				for(let i=0; i<global.ui.proj_colorby_select.length; i++) {
					if (global.ui.proj_colorby_select.options[i].value == e.context.value) {
						global.ui.proj_colorby_select.remove(i);
					}
				}
				let to_remove = global.chosen_stats.indexOf(e.context.value)
				if (to_remove > -1) {
				  global.chosen_stats.splice(to_remove, 1);
				}
			}
		} else if (e.event_type == EVENT.CLICKED_POS) {
			if (e.context.checked) {
				global.chosen_pos.push(e.context.value)
			} else {
				let to_remove = global.chosen_pos.indexOf(e.context.value)
				if (to_remove > -1) {
				  global.chosen_pos.splice(to_remove, 1);
				}
			}
		} else if (e.event_type == EVENT.CHANGE_COLORBY) {
			global.colorby = global.ui.proj_colorby_select.value
		} else if (e.event_type == EVENT.CLUSTER) {
			if (global.ui.n_clusters_select.value !== 0) {
				cluster_chart_data();
			}
		}
		else if (e.event_type == EVENT.TOGGLE_TABLE) {
			if (global.layout_index == 0) {
				if (!global.full_table_filled) {
					fill_full_table();
				}
				global.layout_index = 2;
			} else if (global.layout_index == 2) {
				global.layout_index = 0;
			}
		} else if (e.event_type == EVENT.SORT_TABLE_BY_COL) {
			toggle_class(e.context, 'selected')
			if (e.context.className == 'selected') {
				create_and_fill_full_table_cluster(e.context.cellIndex);
			} else {
				create_and_fill_full_table_cluster(-1);
			}

		} else if (e.event_type == EVENT.FULL_TABLE_PROTOS_ONLY || e.event_type == EVENT.FULL_TABLE_SELECTED_ONLY) {
			create_and_fill_full_table_cluster(-1);
		} else if (e.event_type == EVENT.FILTER_FT_BY_POS) {
			create_and_fill_full_table_cluster(-1);
		} else if (e.event_type == EVENT.SWITCH_FT_STAT_TYPE) {
			create_and_fill_full_table_cluster(-1);
		} else if (e.event_type == EVENT.CHANGE_FT_DEFAULT_SORT) {
			create_and_fill_full_table_cluster(-1)
		}
	}
	global.events.length = 0
}

//--------------
// draw the time series charts
//--------------
function update_ts()
{

	const SIDE = {
		BOTTOM: 0,
		LEFT:1,
		TOP:2,
		RIGHT:3
	}

	const RECT= {
		LEFT: 0,
		TOP:1,
		WIDTH:2,
		HEIGHT:3
	}

	function point_inside_rect(point, rect) {
		let point_inside_x_range = rect[RECT.LEFT] <= point[0] && point[0] <= rect[RECT.LEFT]+rect[RECT.WIDTH]
		let point_inside_y_range = rect[RECT.TOP] <= point[1] && point[1] <= rect[RECT.TOP]+rect[RECT.HEIGHT]
		if (point_inside_x_range && point_inside_y_range) {
			return true
		} else {
			return false
		}
	}

	// -------
	// set line chart canvas, context and rect
	// -------
	let lc_canvas = global.ui.lc_canvas
	let lc_ctx = lc_canvas.getContext('2d')
	lc_canvas.width  = document.getElementById('line_chart_canvas_div').clientWidth;
	lc_canvas.height = document.getElementById('line_chart_canvas_div').clientHeight;

	let lc_local_mouse_pos = get_local_position(global.mouse.position, lc_canvas)


	let lc_rect_inf = [0, 0, lc_canvas.width, lc_canvas.height]
	let lc_rect_margins = [ 30, 55, 5, 5 ]
	let lc_rect = [ lc_rect_inf[0] + lc_rect_margins[SIDE.LEFT],
		        	lc_rect_inf[1] + lc_rect_margins[SIDE.TOP],
		        	lc_rect_inf[2] - lc_rect_margins[SIDE.LEFT] - lc_rect_margins[SIDE.RIGHT],
		        	lc_rect_inf[3] - lc_rect_margins[SIDE.BOTTOM] - lc_rect_margins[SIDE.TOP] ]

	let lc_closest_symbol  = null

	{

		lc_ctx.fillStyle="#2f3233"

		lc_ctx.moveTo(0,0)
		lc_ctx.rect(lc_rect[RECT.LEFT],lc_rect[RECT.TOP],lc_rect[RECT.WIDTH],lc_rect[RECT.HEIGHT])
		lc_ctx.fill()

		// {
		// 	ctx.moveTo(av_rect_inf[0], av_rect_inf[1])
		// 	ctx.rect(av_rect[RECT.LEFT], av_rect[RECT.TOP], av_rect[RECT.WIDTH], av_rect[RECT.HEIGHT])
		// 	ctx.fill()
		// }
		//
		// {
		// 	ctx.moveTo(proj_rect_inf[0], proj_rect_inf[1])
		// 	ctx.rect(proj_rect[RECT.LEFT], proj_rect[RECT.TOP], proj_rect[RECT.WIDTH], proj_rect[RECT.HEIGHT])
		// 	ctx.fill()
		// }

		let date_start = date_offset(global.date_start)
		let date_end   = date_offset(global.date_end)
		let date_norm  = date_offset(global.date_norm)

		lc_ctx.font = "bold 14pt Courier"
		lc_ctx.fillStyle = "#FFFFFF";
		lc_ctx.textAlign = "center";

		//--------------
		//drawing axis strokes
		//--------------
		lc_ctx.strokeStyle = "#FFFFFF";
		lc_ctx.lineWidth   = 2;

		lc_ctx.beginPath()
		//y axis
		lc_ctx.moveTo(lc_rect[RECT.LEFT], lc_rect[RECT.TOP])
		lc_ctx.lineTo(lc_rect[RECT.LEFT], lc_rect[RECT.HEIGHT]+6)
		//x axis
		lc_ctx.moveTo(lc_rect[RECT.LEFT], lc_rect[RECT.HEIGHT]+6)
		lc_ctx.lineTo(lc_rect[RECT.LEFT] + lc_rect[RECT.WIDTH], lc_rect[RECT.HEIGHT]+6)
		lc_ctx.stroke()

		//--------------
		// x range
		//--------------
		// let x_min = 1
		// let x_max = 0
		//
		// for (let i=0; i<global.chart_symbols.length; i++) {
		// 	let symbol = global.chart_symbols[i]
		// 	let games  = Object.keys(symbol.data)
		//
		// 	games.forEach((game, i) => {
		// 		x_max = Math.max(game, x_max)
		// 	});
		//
		// }
		//
		// let x_min = 0
		// let x_max = date_end - date_start
		//--------------
		// find y range
		//--------------
		let y_min = 1.0
		let y_max = 1.0

		let x_min = 1
		let x_max = 82
		let last_valid_value = 1

		let main_stat;
		let selected_stat = global.ui.chosen_stats_select.value
		if (selected_stat !== '') {
			main_stat = selected_stat
		}
		// global.recompute_viewbox = true

		for (let i=0;i<global.chart_symbols.length;i++) {
			let symbol = global.chart_symbols[i]

			symbol.ts_current_values = null
			if (symbol.data == null) {
				continue
			}
			let norm_value = undefined
			// let k = date_end - date_start
			if (global.ui.normalize_btn.checked) {
				let offset = date_norm - date_start
				for (let j=0;j<k;j++) {
					// 0 1 2 3 4 5 * 7 8
					norm_value = symbol.data[date_start + ((offset + j) % k)]
					if (norm_value != undefined) {
						break;
					}
				}
				if (norm_value == undefined) {
					// console.log("no price for symbol " + symbol.name + " on norm date")
				}
			}
			let ts_current_values = []
			let ts_current_values_diffs = []
			for (let j=x_min;j<=x_max;j++) {
				let value;
				if (j in symbol.data) {
					value = symbol.data[j][main_stat];
				} else {
					value = 0
				}
				let last_value = symbol.data[j-1]

				if (value == undefined) {
					value = 0
				} else {
					if(global.ui.normalize_btn.checked) {
						value = value / norm_value
					}
				}

				if (last_value == undefined) {
					last_value = last_valid_value
				} else {
					if(global.ui.normalize_btn.checked) {
						last_value = last_value / norm_value
					}
				}

				let diff
				if (j>date_start) {
					diff = value-last_value
				} else {
					diff = value
				}

				ts_current_values.push(value)
				ts_current_values_diffs.push(diff)
				last_valid_value = value
				y_min = Math.min(y_min, value)
				y_max = Math.max(y_max, value)
			}
			symbol.ts_current_values = ts_current_values
			symbol.ts_current_values_diffs = ts_current_values_diffs
		}

		// if (global.extremal_depth.fbplot.active) {
		// 	y_max = Math.max.apply(y_max, global.extremal_depth.fbplot.outer_band.upper)
		// 	y_min = Math.min.apply(y_min, global.extremal_depth.fbplot.outer_band.lower)
		// }
		//
		// if (global.modified_band_depth.fbplot.active) {
		// 	y_max = Math.max.apply(y_max, global.modified_band_depth.fbplot.outer_band.upper)
		// 	y_min = Math.min.apply(y_min, global.modified_band_depth.fbplot.outer_band.lower)
		// }

		if (global.extremal_depth.fbplot.active || global.modified_band_depth.fbplot.active) {
			let max_outer_bands = Math.max(Math.max.apply(null, global.extremal_depth.fbplot.outer_band.upper),
										   Math.max.apply(null, global.modified_band_depth.fbplot.outer_band.upper))

			let min_outer_bands = Math.min(Math.min.apply(null, global.extremal_depth.fbplot.outer_band.lower),
								  		   Math.min.apply(null, global.modified_band_depth.fbplot.outer_band.lower))

			y_max = Math.max(max_outer_bands, y_max)
			y_min = Math.min(min_outer_bands, y_min)

		}

		if(y_min == y_max) {
			y_min = y_max-1
		}


		if (global.recompute_viewbox) {
			global.viewbox.x 	  = x_min
			global.viewbox.y 	  = y_min
			global.viewbox.width  = x_max - x_min
			global.viewbox.height = y_max - y_min
			global.recompute_viewbox = false
		} else {
			x_min = global.viewbox.x
			y_min = global.viewbox.y
			x_max = global.viewbox.x + global.viewbox.width
			y_max = global.viewbox.y + global.viewbox.height
		}

		let resolution = parseInt(global.ui.create_curve_density_matrix_resolution.value)
		let rows = Math.floor(lc_rect[RECT.HEIGHT] / resolution)
		let cols = Math.floor(lc_rect[RECT.WIDTH] / resolution)
		global.viewbox.resolution = resolution
		global.viewbox.rows = rows
		global.viewbox.cols = cols

		function map(x, y) {
			let px = (lc_rect[RECT.LEFT]+TSVIEW_MARGINS.X) + (1.0 * (x - x_min) / (x_max - x_min)) * (lc_rect[RECT.WIDTH]-2*TSVIEW_MARGINS.X)
			let py = (lc_rect[RECT.TOP]) + ((lc_rect[RECT.HEIGHT]) - 1 - (1.0 * (y - y_min) / (y_max - y_min)) * (lc_rect[RECT.HEIGHT]))
			return [px,py]
		}

		function inverse_map(px, py) {
			let x = (px - (lc_rect[RECT.LEFT]+TSVIEW_MARGINS.X)) / (lc_rect[RECT.WIDTH]-2*TSVIEW_MARGINS.X) * (1.0*(x_max - x_min)) + x_min
			let y = -((((py - (lc_rect[RECT.TOP]+TSVIEW_MARGINS.Y) - (lc_rect[RECT.HEIGHT]-TSVIEW_MARGINS.Y) + 1) * (1.0 * (y_max - y_min))) / (lc_rect[RECT.HEIGHT]-TSVIEW_MARGINS.Y)) - y_min)
			return [x,y]
		}

		let factor = 1.1
		let ref    = inverse_map(lc_local_mouse_pos[0], lc_local_mouse_pos[1])
		let y_ref  = ref[1]
		let x_ref  = ref[0]

		if (point_inside_rect(lc_local_mouse_pos, lc_rect)) {
			if (global.zoom_y != 0) {
				let h = global.viewbox.height
				let h_

				if (global.zoom_y > 0) {
					h_ = h * factor
				} else {
					h_ = h / factor
				}

				global.viewbox.y = -((h_*((y_ref-global.viewbox.y)/h))-y_ref)
				global.viewbox.height = h_

				y_min = global.viewbox.y
				y_max = global.viewbox.y + global.viewbox.height

				global.zoom_y = 0
			}

			if (global.zoom_x != 0) {
				let w = global.viewbox.width
				let w_

				if (global.zoom_x > 0) {
					w_ = Math.floor(w * factor)
				} else {
					w_ = Math.floor(w / factor)
				}

				global.viewbox.x = Math.floor(-((w_*((x_ref-global.viewbox.x)/w))-x_ref))
				global.viewbox.width  = w_

				x_min = global.viewbox.x
				x_max = global.viewbox.x + global.viewbox.width

				global.zoom_x = 0
			}
		} else {
			global.proj_zoom_y = global.zoom_y
			global.proj_zoom_x = global.zoom_x
		}

		if (global.drag.active) {
			let local_dragstart_pos = get_local_position(global.drag.startpos, lc_canvas)
			if (point_inside_rect(local_dragstart_pos, lc_rect)) {

				local_dragstart_pos = inverse_map(local_dragstart_pos[0], local_dragstart_pos[1])

				let local_currmouse_pos = inverse_map(lc_local_mouse_pos[0], lc_local_mouse_pos[1])

				global.viewbox.x = global.drag.startvbox[0] - Math.floor(local_currmouse_pos[0] - local_dragstart_pos[0])
				global.viewbox.y = global.drag.startvbox[1] - (local_currmouse_pos[1] - local_dragstart_pos[1])

				x_min = global.viewbox.x
				x_max = global.viewbox.x + global.viewbox.width

				y_min = global.viewbox.y
				y_max = global.viewbox.y + global.viewbox.height
			} else {
				global.proj_drag.active = true
				global.proj_drag.startpos = global.drag.startpos
				global.proj_drag.startprojvbox = [global.proj_viewbox.x, global.proj_viewbox.y]
			}

		}

		//--------------
		//grid lines
		//--------------

		//--------------
		//x axis grid lines and ticks
		//--------------
		let x_num_ticks = 8
		let x_ticks = []
		for(let i=0; i<x_num_ticks; i++) {
			let x_tick = Math.floor(x_min+(i*((x_max-x_min)/(x_num_ticks-1))))
			x_ticks.push(x_tick)
		}

		for(let i=0; i<x_ticks.length; i++) {
			lc_ctx.strokeStyle = "#555555";
			lc_ctx.lineWidth   = 1;

			let p0 = map(x_ticks[i], y_min)
			let p1 = map(x_ticks[i], y_max)

			lc_ctx.beginPath()
			lc_ctx.moveTo(p0[0], p0[1])
			lc_ctx.lineTo(p1[0], p1[1])
			lc_ctx.stroke()


			lc_ctx.save();
			lc_ctx.font = "bold 10pt Courier"
			lc_ctx.fillStyle = "#FFFFFF"
			lc_ctx.translate(p0[0], p0[1]+15);
			lc_ctx.fillText(x_ticks[i], 0, 0);
			lc_ctx.restore();
		}


		//--------------
		//y grid lines and ticks
		//--------------
		let y_num_ticks = 10
		let y_ticks = []
		for(let i=0; i<y_num_ticks; i++) {
			let y_tick = Math.floor(y_min+((1.0*i*(y_max-y_min))/(y_num_ticks-1)))
			y_ticks.push(y_tick)
		}

		for(let i=0; i<y_ticks.length; i++) {
			lc_ctx.strokeStyle = "#555555";
			lc_ctx.lineWidth   = 1;

			let p0 = map(x_min, y_ticks[i])
			let p1 = map(x_max, y_ticks[i])

			lc_ctx.beginPath()
			lc_ctx.moveTo(p0[0], p0[1])
			lc_ctx.lineTo(p1[0], p1[1])
			lc_ctx.stroke()

			lc_ctx.font = "bold 10pt Courier"
			lc_ctx.fillStyle = "#FFFFFF"
			if(i==(y_ticks.length-1)) {
				lc_ctx.fillText(parseInt(y_ticks[i]), p0[0]-25, p0[1]+8);
			} else {
				lc_ctx.fillText(parseInt(y_ticks[i]), p0[0]-25, p0[1]+5);
			}

		}

		lc_ctx.save()

		lc_ctx.moveTo(0,0)
		lc_ctx.beginPath()
		lc_ctx.rect(lc_rect[RECT.LEFT],lc_rect[RECT.TOP],lc_rect[RECT.WIDTH],lc_rect[RECT.HEIGHT])
		lc_ctx.clip()

		if (global.ui.normalize_btn.checked) {
			//--------------
			//vertical line to track norm date
			//--------------
			let x_norm = date_norm - date_start

			lc_ctx.strokeStyle = "#FFFFFFFF";
			lc_ctx.lineWidth   = 1;

			let p0 = map(x_norm, y_min)
			let p1 = map(x_norm, y_max)

			lc_ctx.beginPath()
			lc_ctx.moveTo(p0[0], p0[1])
			lc_ctx.lineTo(p1[0], p1[1])
			lc_ctx.stroke()

			lc_ctx.save();
			lc_ctx.font = "bold 12pt Courier"
			lc_ctx.fillStyle = "#FFFFFFFF"
			lc_ctx.translate(p1[0]+10, p1[1]+50);
			lc_ctx.rotate(Math.PI/2);
			lc_ctx.fillText(date_offset_to_string(date_start+x_norm), 0, 0);
			lc_ctx.restore();

		}

		//--------------
		// drawing and highlighting utils
		//--------------
		let closest_date = null
		let min_distance_threshold = 5 * 5
		let closest_distance = 100000

		function update_closest_segment(symbol, p0x, p0y, p1x, p1y) {
			// a --> p0 to mouse
			// b --> p0 to p1
			// a.b = |a|*|b|*cos(Theta)
			// a.b/|b| = |a|*cos(theta)
			// |a|^2 - (|a|*cos(theta))^2 = h^2
			// |a|^2 - (a.b/|b|)^2 = h^2
			let ax = lc_local_mouse_pos[0] - p0x
			let ay = lc_local_mouse_pos[1] - p0y

			let bx = p1x - p0x
			let by = p1y - p0y

			let a_len_sq = (ax*ax)+(ay*ay)
			let b_len_sq = (bx*bx)+(by*by)
			let a_dot_b  = (ax*bx)+(ay*by)

			if (a_dot_b < 0) { return }

			let a_shadow_b_len_sq = (a_dot_b*a_dot_b)/b_len_sq
			if (a_shadow_b_len_sq > b_len_sq) {
				return
			}

			let h_sq = a_len_sq - a_shadow_b_len_sq

			let dist = h_sq
			if (dist <= min_distance_threshold && dist < closest_distance) {
				lc_closest_symbol = symbol
				// symbol.focused = true;
			}
		}

		function draw_timeseries(symbol) {

			let ts_current_values = symbol.ts_current_values
			if (ts_current_values == null) {
				return;
			}

			let i = global.chart_symbols.indexOf(symbol)
			if (symbol.data == null) {
				return;
			}

			if (global.ui.draw_groups_envelope_btn.checked || document.getElementById('protos_only_checkbox').checked) {
				if (symbol.proto == false && symbol != global.focused_symbol && !symbol.selected) {
					return;
				}
			}

			if (document.getElementById('selected_only_checkbox').checked) {
				if (!symbol.selected) { return; }
			}

			if (!check_ft_pos_filters(symbol)) { return; }

			let first_point_drawn   = false
			let curve_color 		= null
			let curve_focused_color = null
			let symbol_color 		= null

			if (global.aux_view != 'none') {

				curve_color = "#FFFFFF44";
				let seq_scale_idx;

				switch (global.colorby) {
					case 'default': {
						curve_focused_color = global.chart_colors[i];
						symbol_color 		= global.chart_colors[i];
						} break;
					case 'position': {
						curve_focused_color = POSITION_COLORS[symbol.position[0]];
						symbol_color 		= POSITION_COLORS[symbol.position[0]];
						} break;
					case 'games_played': {
						let seq_scale_idx 	 = (Object.keys(symbol.data).length / MAX_GP) * (SEQUENTIAL_COLORS.length-1);
						let seq_scale_idx_fl = Math.floor(seq_scale_idx);

						let a = seq_scale_idx_fl;
						let b = Math.min(a+1, SEQUENTIAL_COLORS.length-1);

						let lambda = 1-(seq_scale_idx-seq_scale_idx_fl);
						let color  = hex_lerp(SEQUENTIAL_COLORS[a], SEQUENTIAL_COLORS[b], lambda);

						symbol_color 		= color;
						curve_focused_color = color;
						} break;
					default: {
						let sr = global.stats_ranges[global.colorby];
						let s  = symbol.summary[global.colorby];

						let seq_scale_idx 	 = (s - sr[0]) / (sr[1] - sr[0]) * (SEQUENTIAL_COLORS.length-1);
						let seq_scale_idx_fl = Math.floor(seq_scale_idx);

						let a = seq_scale_idx_fl;
						let b = Math.min(a+1, SEQUENTIAL_COLORS.length-1);

						let lambda = 1-(seq_scale_idx-seq_scale_idx_fl);
						let color  = hex_lerp(SEQUENTIAL_COLORS[a], SEQUENTIAL_COLORS[b], lambda);

						symbol_color 		= color;
						curve_focused_color = color;
						} break;
				}

			} else {

				curve_color 		= global.chart_colors[i]
				curve_focused_color = global.chart_colors[i]
				symbol_color 		= global.chart_colors[i]

			}


			if (symbol.group) {
				curve_color 		= symbol.group.color;
				curve_focused_color = symbol.group.color;
				symbol_color 		= symbol.group.color;
			}

			if (global.selected_symbols.length > 0) {
				if (curve_color !== "#FFFFFF44") {
					curve_color += '44'
				}
			}

			lc_ctx.strokeStyle = curve_color
			symbol.ui_col.style.color = symbol_color

			if ((symbol == global.focused_symbol) || symbol.selected) {
				if (symbol.selected && document.getElementById('selected_only_checkbox').checked) {
					lc_ctx.lineWidth = 2
				} else {
					lc_ctx.lineWidth = 4
				}
				lc_ctx.strokeStyle = curve_focused_color
			} else {
				lc_ctx.lineWidth = 2
			}

			lc_ctx.beginPath()
			let p_prev = null
			for (let j=x_min;j<=x_max;j++) {
				// let date_offset = date_start+j
				let yi = ts_current_values[j-1]
				let p = map(j,yi)
				if (p_prev) {
					update_closest_segment(symbol, p_prev[0], p_prev[1], p[0], p[1])
				}
				p_prev = p
				if (!first_point_drawn) {
					lc_ctx.moveTo(p[0],p[1])
					first_point_drawn = true
				} else {
					lc_ctx.lineTo(p[0],p[1])
				}
			}
			lc_ctx.stroke()
		}


		if (global.denselines.active) {

			let updated = build_curves_density_matrix()

			rows = global.viewbox.rows
			cols = global.viewbox.cols
			let max_value = Math.max.apply(null, global.denselines.entries)

			let cell_width  = lc_rect[RECT.WIDTH] / global.viewbox.cols
			let cell_height = lc_rect[RECT.HEIGHT] / global.viewbox.rows

			let starting_x = lc_rect[RECT.LEFT]
			let starting_y = lc_rect[RECT.TOP]

			let matrix = global.denselines.entries

			lc_ctx.save()
			for (let i=0; i<rows; i++) {
				for (let j=0; j<cols; j++) {
					let value = matrix[(cols*i)+j]
					if(global.ui.normalize_btn.checked) {
						value = value / norm_value
					}
					let color = "#2f3233"
					let color_scale = ['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58','#081d58']

					if (value > 0.0) {
						let x = value * (color_scale.length-1)
						let x_idx = Math.floor(x)
						let x_idx_next = Math.min(x_idx+1, color_scale.length-1)
						let lambda = 1 - (x - x_idx)
						color = hex_lerp(color_scale[x_idx], color_scale[x_idx_next], lambda)
					}

					lc_ctx.fillStyle = color
					lc_ctx.strokeStyle = ctx.fillStyle
					lc_ctx.beginPath()
					lc_ctx.rect( starting_x + (cell_width*j),
						  		 lc_rect[RECT.HEIGHT] - (i + 1) * cell_height, cell_width, cell_height)
					lc_ctx.closePath()
					lc_ctx.fill()
					lc_ctx.stroke()
				}
			}
			lc_ctx.restore()
		}

		//--------------
		// running extremal depth algorithm and drawing bands
		//--------------
		if (global.extremal_depth.fbplot.active) {

			if(global.chart_symbols.length == 0) {
				console.log("No symbols selected!")
			} else {
				//--------------
				// drawing inner band
				//--------------
				let ymin = global.extremal_depth.fbplot.inner_band.lower
				let ymax = global.extremal_depth.fbplot.inner_band.upper
				let num_timesteps = global.extremal_depth.ranked_symbols[0].ts_current_values.length

				lc_ctx.save()

				lc_ctx.beginPath()
				let p = map(0,ymin[0])
				lc_ctx.moveTo(p[0],p[1])
				for (let j=1;j<num_timesteps;j++) {
					p = map(j,ymin[j])
					lc_ctx.lineTo(p[0],p[1])
				}
				for (let j=num_timesteps-1;j>=0;j--) {
					p = map(j,ymax[j])
					lc_ctx.lineTo(p[0],p[1])
				}
				lc_ctx.closePath()
				lc_ctx.fillStyle="#00FFFF55"
				lc_ctx.fill()

				lc_ctx.restore()

				//--------------
				// drawing outer band
				//--------------
				let ymin_outer = global.extremal_depth.fbplot.outer_band.lower
				let ymax_outer = global.extremal_depth.fbplot.outer_band.upper

				lc_ctx.save()
				lc_ctx.strokeStyle = "#FFFFFF"
				lc_ctx.setLineDash([5, 3])
				lc_ctx.beginPath()
				p = map(0,ymin_outer[0])
				lc_ctx.moveTo(p[0],p[1])
				for (let j=1;j<num_timesteps;j++) {
					p = map(j,ymin_outer[j])
					lc_ctx.lineTo(p[0],p[1])
				}
				for (let j=num_timesteps-1;j>=0;j--) {
					p = map(j,ymax_outer[j])
					lc_ctx.lineTo(p[0],p[1])
				}
				lc_ctx.stroke()
				lc_ctx.restore()

				//--------------
				// drawing median curve
				//--------------
				let median_symbol = global.extremal_depth.ranked_symbols[global.extremal_depth.ranked_symbols.length - 1]
				draw_timeseries(median_symbol, false,)

				if (global.ui.ed_draw_outliers_btn.checked) {
					//--------------
					// drawing outliers
					//--------------
					for(let i=0; i<global.extremal_depth.fbplot.outliers.length; i++) {
						let symbol = global.extremal_depth.fbplot.outliers[i]
						draw_timeseries(symbol, false)
					}

				}

			}

		}

		if (global.modified_band_depth.fbplot.active) {

			if(global.chart_symbols.length == 0) {
				console.log("No symbols selected!")
			} else {
				//--------------
				// drawing inner band
				//--------------
				let ymin = global.modified_band_depth.fbplot.inner_band.lower
				let ymax = global.modified_band_depth.fbplot.inner_band.upper
				let num_timesteps = global.modified_band_depth.ranked_symbols[0].ts_current_values.length

				lc_ctx.save()
				lc_ctx.beginPath()
				let p = map(0,ymin[0])
				lc_ctx.moveTo(p[0],p[1])
				for (let j=1;j<num_timesteps;j++) {
					p = map(j,ymin[j])
					lc_ctx.lineTo(p[0],p[1])
				}
				for (let j=num_timesteps-1;j>=0;j--) {
					p = map(j,ymax[j])
					lc_ctx.lineTo(p[0],p[1])
				}
				lc_ctx.closePath()
				lc_ctx.fillStyle="#FF000055"
				lc_ctx.fill()
				lc_ctx.restore()

				//--------------
				// drawing outer band
				//--------------
				let ymin_outer = global.modified_band_depth.fbplot.outer_band.lower
				let ymax_outer = global.modified_band_depth.fbplot.outer_band.upper

				lc_ctx.save()
				lc_ctx.strokeStyle = "#FFFFFF"
				lc_ctx.setLineDash([5, 3])
				lc_ctx.beginPath()
				p = map(0,ymin_outer[0])
				lc_ctx.moveTo(p[0],p[1])
				for (let j=1;j<num_timesteps;j++) {
					p = map(j,ymin_outer[j])
					lc_ctx.lineTo(p[0],p[1])
				}
				for (let j=num_timesteps-1;j>=0;j--) {
					p = map(j,ymax_outer[j])
					lc_ctx.lineTo(p[0],p[1])
				}
				lc_ctx.stroke()
				lc_ctx.restore()

				//--------------
				// drawing median curve
				//--------------
				let median_symbol = global.modified_band_depth.ranked_symbols[global.modified_band_depth.ranked_symbols.length - 1]
				draw_timeseries(median_symbol, false)

				if (global.ui.mbd_draw_outliers_btn.checked) {
					//--------------
					// drawing outliers
					//--------------
					for(let i=0; i<global.modified_band_depth.fbplot.outliers.length; i++) {
						let symbol = global.modified_band_depth.fbplot.outliers[i]
						draw_timeseries(symbol, false)
					}

				}

			}

		}

		//--------------
		// drawing curves
		//--------------
		if (global.ui.draw_curves_btn.checked) {

			for (let i=0;i<global.chart_symbols.length;i++) {

				let symbol = global.chart_symbols[i]

				if (symbol.selected) {
					continue;
				}

				if(global.focused_symbol == null || global.chart_symbols[i] != global.focused_symbol) {
					if (symbol.filter == 0) {
						if (check_position_filters(symbol) && check_gp_filter(symbol)) {
							draw_timeseries(symbol)
						} else {
							remove_symbol_from_chart(symbol)
						}
					}
				}
			}

			for (let i=0; i<global.selected_symbols.length; i++) {
				let symbol = global.chart_symbols[global.selected_symbols[i]];
				draw_timeseries(symbol);
			}


		}

		function draw_group_fbplot(group, depth_type) {
			//--------------
			// drawing inner band
			//--------------
			let group_depth = null
			if(depth_type == "ed") {
				group_depth = group.fbed
			}

			if (depth_type == "mbd") {
				group_depth = group.fbmbd
			}

			let ymin = group_depth.inner_band.lower
			let ymax = group_depth.inner_band.upper
			let num_timesteps = group_depth.ranked_symbols[0].ts_current_values.length

			lc_ctx.save()
			lc_ctx.beginPath()
			let p = map(0,ymin[0])
			lc_ctx.moveTo(p[0],p[1])
			for (let j=1;j<num_timesteps;j++) {
				p = map(j,ymin[j])
				lc_ctx.lineTo(p[0],p[1])
			}
			for (let j=num_timesteps-1;j>=0;j--) {
				p = map(j,ymax[j])
				lc_ctx.lineTo(p[0],p[1])
			}
			lc_ctx.closePath()
			lc_ctx.fillStyle = group.color + "55"
			lc_ctx.fill()
			lc_ctx.restore()

			//--------------
			// drawing outer band
			//--------------
			let ymin_outer = group_depth.outer_band.lower
			let ymax_outer = group_depth.outer_band.upper

			lc_ctx.save()
			lc_ctx.strokeStyle = group.color + "DD"
			lc_ctx.setLineDash([5, 3])
			lc_ctx.beginPath()
			p = map(0,ymin_outer[0])
			lc_ctx.moveTo(p[0],p[1])
			for (let j=1;j<num_timesteps;j++) {
				p = map(j,ymin_outer[j])
				lc_ctx.lineTo(p[0],p[1])
			}
			for (let j=num_timesteps-1;j>=0;j--) {
				p = map(j,ymax_outer[j])
				lc_ctx.lineTo(p[0],p[1])
			}
			lc_ctx.stroke()
			lc_ctx.restore()

			//--------------
			// drawing median curve
			//--------------
			let median_symbol = group_depth.ranked_symbols[group_depth.ranked_symbols.length - 1]
			draw_timeseries(median_symbol, false, group.color)
		}

		for (let i=0; i<global.chart_groups.length; i++) {
			let group   = global.chart_groups[i]
			if (group.fbed.active) {
				draw_group_fbplot(group, "ed")
			}
			if(group.fbmbd.active) {
				draw_group_fbplot(group, "mbd");
			}
		}

		// --------------
		// highlight on focused time series and show game date
		// --------------
		let clamp = function(a,b,c) {
			return Math.max(b,Math.min(c,a));
		}

		if (global.focused_symbol != null) {
			draw_timeseries(global.focused_symbol, true);

			let record = global.focused_symbol;
			let text;
			// if (parseInt(Math.round(pt[0])) in Object.keys(record.data)) {
			// 	if (record.data[Math.round(pt[0])] === undefined) {
			// 		console.log(record, Math.round(pt[0]));
			// 	}
			// 	let game_date = record.data[Math.round(pt[0])].date;
			// 	text = `player: ${record.name} // position: ${record.position} // date: ${game_date}`;
			// } else {
			text = `player: ${record.name} // position: ${record.position}`
			// }


			if (global.aux_view != 'none') {
				lc_ctx.font = '14px Monospace';
			} else {
				lc_ctx.font = '20px Monospace';
			}
			lc_ctx.textAlign = 'center';
			lc_ctx.fillText(text, lc_rect[2]/2, 40);
		}

		// --------------
		// auxiliar lines on mouse position to track date and value
		// --------------
		if (point_inside_rect(lc_local_mouse_pos, lc_rect)) {
			let pt = inverse_map(lc_local_mouse_pos[0],lc_local_mouse_pos[1]);
			pt[0] = clamp(pt[0],x_min,x_max);
			pt[1] = clamp(pt[1],y_min,y_max);

			let y_p0 = map(Math.floor(0.5+pt[0]),y_min)
			let y_p1 = map(Math.floor(0.5+pt[0]),y_max)

			lc_ctx.strokeStyle = "#555555"
			lc_ctx.lineWidth = '1'

			let x_p0 = map(x_min, pt[1])
			let x_p1 = map(x_max, pt[1])

			lc_ctx.beginPath()
			lc_ctx.moveTo(x_p0[0]-20, x_p0[1])
			lc_ctx.lineTo(x_p1[0], x_p1[1])
			lc_ctx.stroke()

			lc_ctx.restore() // LC_RECT CLIP END

			drawTextBG(lc_ctx, Math.round(pt[1]), x_p0[0]-20, x_p0[1])
		}

		//--------------
		// update start, end and norm dates on keyboard controls
		//--------------
		// if (global.key_update_norm) {
		// 	let pt_n = inverse_map(lc_local_mouse_pos[0],lc_local_mouse_pos[1])
		// 	let new_date_norm = date_offset_to_string(Math.floor(date_start+pt_n[0]))
		//
		// 	document.getElementById('norm_date_input').value = new_date_norm
		// 	global.date_norm = new_date_norm
		// 	global.key_update_norm = false
		// }
		//
		// if (global.key_update_start) {
		// 	let pt_s = inverse_map(lc_local_mouse_pos[0],lc_local_mouse_pos[1])
		// 	let new_date_start = date_offset_to_string(Math.floor(date_start+pt_s[0]))
		//
		// 	document.getElementById('start_date_input').value = new_date_start
		// 	global.date_start = new_date_start
		// 	global.key_update_start = false
		// }
		//
		// if (global.key_update_end) {
		// 	let pt_e = inverse_map(lc_local_mouse_pos[0],lc_local_mouse_pos[1])
		// 	let new_date_end = date_offset_to_string(Math.floor(date_start+pt_e[0]))
		//
		// 	document.getElementById('end_date_input').value = new_date_end
		// 	global.date_end = new_date_end
		// 	global.key_update_end = false
		// }
	} // time series drawings

	let av_canvas = global.ui.av_canvas;
	let av_ctx = av_canvas.getContext('2d');
	// let aux_view = get_component('aux_view');
	av_canvas.width  = document.getElementById('aux_view_canvas_div').clientWidth;
	av_canvas.height = document.getElementById('aux_view_canvas_div').clientHeight;

	let av_local_mouse_pos = get_local_position(global.mouse.position, av_canvas)

	av_ctx.clearRect(0, 0, av_canvas.width, av_canvas.height)

	let av_rect_inf = [0,0, av_canvas.width, av_canvas.height]
	let av_rect_margins = [ 15, 20, 5, 5 ]
	let av_rect = [ av_rect_inf[0] + av_rect_margins[SIDE.LEFT],
					av_rect_inf[1] + av_rect_margins[SIDE.TOP],
					av_rect_inf[2] - av_rect_margins[SIDE.LEFT] - av_rect_margins[SIDE.RIGHT],
					av_rect_inf[3] - av_rect_margins[SIDE.BOTTOM] - av_rect_margins[SIDE.TOP] ]

	let aux_view_closest_symbol = null

	{

		av_ctx.fillStyle="#2f3233"

		av_ctx.moveTo(av_rect_inf[0], av_rect_inf[1])
		av_ctx.rect(av_rect[RECT.LEFT], av_rect[RECT.TOP], av_rect[RECT.WIDTH], av_rect[RECT.HEIGHT])
		av_ctx.fill()

		av_ctx.font = "bold 14pt Courier"
		av_ctx.fillStyle = "#FFFFFF";
		av_ctx.textAlign = "center";

		//--------------
		//drawing axis strokes
		//--------------
		av_ctx.save()
		av_ctx.strokeStyle = "#FFFFFF";
		av_ctx.lineWidth   = 2;

		//--------------
		// find y range
		//--------------
		let aux_y_min = 1.0
		let aux_y_max = 0.0
		let last_valid_value = 1

		for (let i=0;i<global.chart_symbols.length;i++) {
			let symbol = global.chart_symbols[i]

			let values
			if (global.aux_view == 'dcdf') {
				values = symbol.cdf_matrix_row
			} else if (global.aux_view == 'rcdf') {
				values = symbol.gt_ranks_dist
			}

			if (values == null) {
				continue
			}

			let k = values.length
			let current_values = []
			for (let j=0;j<k;j++) {
				let value = values[j]
				if (value == undefined) {
					value = last_valid_value
				}
				//--------------
				// if drawing separated values for pointwise depths cdfs
				// dissipate them
				//--------------
				if(global.ui.agg_sep_select.value === 'sep') {
					if (j>0) {
						value = values[j] - values[j-1]
					}
				}
				current_values.push(value)
				last_valid_value = value
				aux_y_min = Math.min(aux_y_min, value)
				aux_y_max = Math.max(aux_y_max, value)
			}

		}

		let aux_x_min = 0
		let aux_x_max
		if (global.aux_view == 'dcdf') {
			aux_x_max = global.chart_symbols[0].cdf_matrix_row.length - 1
		} else if (global.aux_view == 'rcdf') {

			if (global.ui.agg_sep_select.value === 'agg') {
				let last_rank = 0

				for (let i=0; i<global.chart_symbols.length; i++) {

					let symbol = global.chart_symbols[i]
					if (symbol.gt_ranks_dist == null) { continue }
					for (let j=0; j<symbol.gt_ranks_dist.length; j++) {
						if (symbol.gt_ranks_dist[j] == 1.0) {
							last_rank = Math.max(last_rank, j)
							break
						}
					}

				}

				aux_x_max = last_rank + 1

			} else if (global.ui.agg_sep_select.value === 'sep') {
				aux_x_max = global.chart_symbols.length -1
			}
		}

		let min_distance_threshold = 5 * 5
		let closest_distance = 100000

		function update_aux_closest_segment(symbol, p0x, p0y, p1x, p1y) {
			// a --> p0 to mouse
			// b --> p0 to p1
			// a.b = |a|*|b|*cos(Theta)
			// a.b/|b| = |a|*cos(theta)
			// |a|^2 - (|a|*cos(theta))^2 = h^2
			// |a|^2 - (a.b/|b|)^2 = h^2

			let ax = av_local_mouse_pos[0] - p0x
			let ay = av_local_mouse_pos[1] - p0y

			let bx = p1x - p0x
			let by = p1y - p0y

			let a_len_sq = (ax*ax)+(ay*ay)
			let b_len_sq = (bx*bx)+(by*by)
			let a_dot_b  = (ax*bx)+(ay*by)

			if (a_dot_b < 0) { return }

			let a_shadow_b_len_sq = (a_dot_b*a_dot_b)/b_len_sq
			if (a_shadow_b_len_sq > b_len_sq) {
				return
			}

			let h_sq = a_len_sq - a_shadow_b_len_sq

			let dist = h_sq
			if (dist <= min_distance_threshold && dist < closest_distance) {
				aux_view_closest_symbol = symbol
			}
		}

		function update_closest_point(symbol, rank, px, py) {
			let dx = av_local_mouse_pos[0] - px
			let dy = av_local_mouse_pos[1] - py
			let dist = dx * dx + dy * dy
			if (dist <= min_distance_threshold && dist < closest_distance) {
				aux_view_closest_symbol = symbol
			}
		}

		let n_ranks = aux_x_max
		global.n_ranks = n_ranks;

		function rotate(arr, a, b) {
			let x = arr[b-1]
			for (let i=b-1; i>a; i--) {
				arr[i] = arr[i-1]
			}
			arr[a] = x
		}

		//performing split on given rank
		if (global.split_cdf.split_rank) {
			let breaks  = global.split_cdf.breaks
			let weights = global.split_cdf.ww

			let split_rank = global.split_cdf.split_rank
			global.split_cdf.split_rank = null

			if (split_rank < n_ranks) {
				let split_rank_idx = -breaks.length-1
				for (let i=0; i<breaks.length; i++) {
					if (breaks[i] == split_rank) {
						split_rank_idx = i
						break
					} else if (breaks[i] > split_rank) {
						split_rank_idx = -i-1
						break
					}
				}
				if (split_rank_idx < 0) { //negative number means split_rank doesnt exist yet, it'll be added
					split_rank_idx  = -split_rank_idx-1
					let curr_weight = weights[split_rank_idx-1]

					let left  		= breaks[split_rank_idx-1]
					let right 		= (split_rank_idx == breaks.length) ? n_ranks : breaks[split_rank_idx]

					let curr_bins   = right - left
					let left_bins   = split_rank - left
					let right_bins  = right - split_rank

					weights[split_rank_idx-1] = curr_weight * (left_bins / curr_bins)
					weights.push(curr_weight * (right_bins / curr_bins))
					rotate(weights, split_rank_idx, weights.length)

					breaks.push(split_rank)
					rotate(breaks, split_rank_idx, breaks.length)

					global.split_cdf.filters.push([])
					global.split_cdf.realign.push(true)
				}

			}

		}

		if (global.split_cdf.panel_state == PANEL_STATE.RESIZING) {
			let dx = av_local_mouse_pos[0] - global.split_cdf.panel_resize_last_x
			global.split_cdf.panel_resize_last_x = av_local_mouse_pos[0]

			let panel_idx 		   = global.split_cdf.panel_resize_index
			let panel_resize_width = global.split_cdf.ww[panel_idx] * av_rect[RECT.WIDTH]
			let panel_resize_side  = global.split_cdf.panel_resize_side

			let delta = dx / panel_resize_width
			if (panel_resize_side == PANEL_RESIZE_SIDE.LEFT) {
				if (delta > 0) {
					global.split_cdf.ww[panel_idx] -= delta
					global.split_cdf.ww[panel_idx-1] += delta
				} else {
					global.split_cdf.ww[panel_idx] -= delta
					global.split_cdf.ww[panel_idx-1] += delta
				}
			} else {
				if (delta > 0) {
					global.split_cdf.ww[panel_idx] += delta
					global.split_cdf.ww[panel_idx+1] -= delta
				} else {
					global.split_cdf.ww[panel_idx] += delta
					global.split_cdf.ww[panel_idx+1] -= delta
				}
			}
		}


		if (global.split_cdf.ww.length > 0) {
			let sorted_wws 	  = global.split_cdf.ww
			let sorted_breaks = global.split_cdf.breaks

			let offset = av_rect[RECT.LEFT]
			for (let i=0; i<sorted_wws.length; i++) {
				av_ctx.fillStyle = "#555555"

				let panel_rect = null
				let panel_width = av_rect[RECT.WIDTH]*sorted_wws[i]
				panel_rect = [ offset,
							   av_rect[RECT.TOP]+5,
							   panel_width,
							   av_rect[RECT.HEIGHT]-10 ]

				offset += panel_width
				av_ctx.beginPath()
				av_ctx.rect(panel_rect[RECT.LEFT], panel_rect[RECT.TOP],
						 panel_rect[RECT.WIDTH], panel_rect[RECT.HEIGHT])
				av_ctx.fill()

				let step = parseInt(global.ui.step_select.value);
				let offset_start = sorted_breaks[i] + step - 1;
				let offset_end = (i==sorted_wws.length-1) ? n_ranks : sorted_breaks[i+1]

				let panel_x_min = offset_start
				let panel_x_max = offset_end
				let panel_y_min = 0
				let panel_y_max = 0

				for (let j=0; j<n_ranks; j++) {

					let symbol = global.chart_symbols[j]
					if (symbol === undefined) { continue; }
					if (symbol.filter != 0) {
						continue
					}
					let current_values
					if (global.aux_view == 'dcdf') {
						current_values = symbol.cdf_matrix_row
					} else if (global.aux_view == 'rcdf') {
						current_values = symbol.gt_ranks_dist
					}
					if (current_values == null) {
						return;
					}

					for (let k=panel_x_min; k<panel_x_max; k++) {
						if (i==0) {
							panel_y_max = Math.max(panel_y_max, current_values[k])
						} else {
							panel_y_max = Math.max(panel_y_max, current_values[k]-current_values[panel_x_min-1])
						}
					}
				}

				function panel_rect_map(x, y) {
					let px = (panel_rect[RECT.LEFT] + (1.0 * (x - panel_x_min) / (panel_x_max - panel_x_min)) * panel_rect[RECT.WIDTH])
					let py = (panel_rect[RECT.TOP]+VIEWS_MARGINS) + ((panel_rect[RECT.HEIGHT]-VIEWS_MARGINS) - 1 - (1.0 * (y - panel_y_min) / (panel_y_max - panel_y_min)) * (panel_rect[RECT.HEIGHT]-VIEWS_MARGINS))
					return [px,py]
				}

				function panel_rect_inverse_map(px, py) {
					let x = ((px - panel_rect[RECT.LEFT]) / panel_rect[RECT.WIDTH]) * (1.0*(panel_x_max - panel_x_min)) + panel_x_min
					let y = -((((py - (panel_rect[RECT.TOP]+VIEWS_MARGINS) - (panel_rect[RECT.HEIGHT]-VIEWS_MARGINS) + 1) * (1.0 * (panel_y_max - panel_y_min))) / (panel_rect[RECT.HEIGHT]-VIEWS_MARGINS)) - panel_y_min)
					return [x,y]
				}

				let x_axis_offset = (panel_rect[RECT.WIDTH]/(panel_x_max-panel_x_min))/2

				// FILTER STUFF
				function detect_click_inside_filter(local_click_pos) {
					let clicked_filter = null
					for(let i=0; i<global.filter_list.length; i++) {
						let filter = global.filter_list[i]
						if(point_inside_rect(local_click_pos, filter.rect)) {
							clicked_filter = filter
						}
					}

					return clicked_filter
				}

				if(point_inside_rect(av_local_mouse_pos, panel_rect)) {
					if (global.key_break) {
						let break_pt = panel_rect_inverse_map(av_local_mouse_pos[0], av_local_mouse_pos[1])
						global.split_cdf.split_rank = Math.floor(break_pt[0])
						global.key_break = false
					}

					if (global.split_cdf.panel_state == PANEL_STATE.START_RESIZE) {
						global.split_cdf.panel_resize_index  = i
						global.split_cdf.panel_resize_last_x = av_local_mouse_pos[0]

						if (i==0) {
							global.split_cdf.panel_resize_side = PANEL_RESIZE_SIDE.RIGHT
						} else if (i==(sorted_wws.length-1)) {
							global.split_cdf.panel_resize_side = PANEL_RESIZE_SIDE.LEFT
						} else {
							let mouse_on_left_half = av_local_mouse_pos[0] < (panel_rect[RECT.LEFT]+panel_rect[RECT.WIDTH]/2)
							global.split_cdf.panel_resize_side = (mouse_on_left_half) ? PANEL_RESIZE_SIDE.LEFT : PANEL_RESIZE_SIDE.RIGHT
						}

						global.split_cdf.panel_state = PANEL_STATE.RESIZING
					}

					if (global.filter_state == FILTER_STATE.START) {
						let clicked_filter = detect_click_inside_filter(av_local_mouse_pos)
						if (clicked_filter) {
							global.filter_moving = clicked_filter
							global.filter_state  = FILTER_STATE.MOVE
						} else {
							let dm_filter_pos = panel_rect_inverse_map(av_local_mouse_pos[0], av_local_mouse_pos[1])

							let filter = { y: dm_filter_pos[1], type: global.filter_type, panel: i }

							global.filter_list.push(filter)
							global.filter_state = FILTER_STATE.INACTIVE

						}
					} else if (global.filter_state == FILTER_STATE.MOVE) {
						if (point_inside_rect(av_local_mouse_pos, panel_rect)) {
							let filter = global.filter_moving
							let dm_filter_newpos = panel_rect_inverse_map(av_local_mouse_pos[0], av_local_mouse_pos[1])

							filter.y = dm_filter_newpos[1]

						}
					}


				}

				for (let f=0; f<global.filter_list.length; f++) {
					let filter = global.filter_list[f]

					if (filter.panel == i) {
						let cv_filter_startpos = panel_rect_map(panel_x_min, filter.y)
						cv_filter_startpos[0] = cv_filter_startpos[0] + x_axis_offset

						let cv_filter_endpos   = panel_rect_map(panel_x_max-1, filter.y)
						cv_filter_endpos[0] = cv_filter_endpos[0] + x_axis_offset

						let filter_rect = [cv_filter_startpos[0], cv_filter_startpos[1], cv_filter_endpos[0]-cv_filter_startpos[0], 4]
						filter.rect = filter_rect

						let color
						if (filter.type == FILTER_TYPE.RED) {
							color = "#FF8888"
						} else {
							color = "#8888FF"
						}

						av_ctx.fillStyle = color
						av_ctx.fillRect(filter_rect[RECT.LEFT], filter_rect[RECT.TOP], filter_rect[RECT.WIDTH], filter_rect[RECT.HEIGHT])
					}
				}

				function check_filters(symbol) {
					let current_values
					if (global.aux_view == 'dcdf') {
						current_values = symbol.cdf_matrix_row
					} else if (global.aux_view == 'rcdf') {
						current_values = symbol.gt_ranks_dist
					}
					if (current_values == null) {
						return;
					}

					let ok_blue = true
					let ok_red  = true
					let panel_filters_count = 0
					for (let f=0; f<global.filter_list.length; f++) {
						let filter = global.filter_list[f]
						if (filter.panel == i) {
							panel_filters_count += 1
							if (filter.type == FILTER_TYPE.RED) {
								for (let c=panel_x_min;c<panel_x_max;c++) {
									let yj
									if (i==0) {
										yj = current_values[c]
									} else {
										yj = current_values[c] - current_values[panel_x_min-1]
									}
				//
									let point_over_y = (yj > filter.y)
				//
									if (point_over_y) {
										ok_red = false
										break
									}
								}
							}
							if (filter.type == FILTER_TYPE.BLUE) {
								let at_least_one_over = false
								for (let c=panel_x_min;c<panel_x_max;c++) {
									let yj
									if (i==0) {
										yj = current_values[c]
									} else {
										yj = current_values[c] - current_values[panel_x_min-1]
									}
				//
									let point_over_y = (yj > filter.y)
				//
									if (point_over_y) {
										at_least_one_over = true
									}
								}
								ok_blue = at_least_one_over
								if (ok_blue == false) { break }
							}

						}

					}

					let ok = (ok_red && ok_blue) || (panel_filters_count == 0)
					const mask = (1 << 30)-1
					const panel_mask = (1 << i)
					symbol.filter = (symbol.filter & (mask ^ panel_mask)) | (ok ? 0 : panel_mask)
					return ok

				}

				function draw_symbol_on_panel(symbol) {
					let current_values
					if (global.aux_view == 'dcdf') {
						current_values = symbol.cdf_matrix_row
					} else if (global.aux_view == 'rcdf') {
						current_values = symbol.gt_ranks_dist
					}
					if (current_values == null) {
						return;
					}

					let idx = global.chart_symbols.indexOf(symbol)
					if (symbol.data == null) {
						return
					}

					if (global.ui.draw_groups_envelope_btn.checked) {
						if (symbol.group !== null && symbol !== global.focused_symbol && symbol.proto == false && !symbol.selected) {
							return
						}
					}

					if (document.getElementById('protos_only_checkbox').checked) {
						if (symbol.proto == false && symbol != global.focused_symbol) {
							return;
						}
					}

					if (document.getElementById('selected_only_checkbox').checked) {
						if (!symbol.selected) { return; }
					}

					if (!check_ft_pos_filters(symbol)) { return; }

					let curve_color = "#FFFFFF44"

					av_ctx.save()
					if ((symbol == global.focused_symbol) || symbol.selected) {
						if (symbol.selected && document.getElementById('selected_only_checkbox').checked) {
							av_ctx.lineWidth = 2
						} else {
							av_ctx.lineWidth = 4
						}
						let seq_scale_idx;

						switch (global.colorby) {
							case 'default': {
								curve_color = global.chart_colors[idx];
								} break;
							case 'position': {
								curve_color = POSITION_COLORS[symbol.position[0]];
								} break;
							case 'games_played': {
								let seq_scale_idx 	 = (Object.keys(symbol.data).length / MAX_GP) * (SEQUENTIAL_COLORS.length-1);
								let seq_scale_idx_fl = Math.floor(seq_scale_idx);

								let a = seq_scale_idx_fl;
								let b = Math.min(a+1, SEQUENTIAL_COLORS.length-1);

								let lambda = 1-(seq_scale_idx-seq_scale_idx_fl);
								let color  = hex_lerp(SEQUENTIAL_COLORS[a], SEQUENTIAL_COLORS[b], lambda);

								curve_color = color;
								} break;
							default: {
								let sr = global.stats_ranges[global.colorby];
								let s  = symbol.summary[global.colorby];

								let seq_scale_idx 	 = (s - sr[0]) / (sr[1] - sr[0]) * (SEQUENTIAL_COLORS.length-1);
								let seq_scale_idx_fl = Math.floor(seq_scale_idx);

								let a = seq_scale_idx_fl;
								let b = Math.min(a+1, SEQUENTIAL_COLORS.length-1);

								let lambda = 1-(seq_scale_idx-seq_scale_idx_fl);
								let color  = hex_lerp(SEQUENTIAL_COLORS[a], SEQUENTIAL_COLORS[b], lambda);

								curve_color = color;
								} break;
						}
					} else {
						av_ctx.lineWidth = 2;
					}

					if (symbol.group) {
						curve_color = symbol.group.color;
					}

					if (global.selected_symbols.length > 0 && (!symbol.selected && (symbol !== global.focused_symbol))) {
						if (curve_color !== "#FFFFFF44") {
							curve_color += '44'
						}
					}

					av_ctx.strokeStyle = curve_color;
					av_ctx.fillStyle = curve_color;


					let first_point_drawn = false

					let p_prev = null
					if ((panel_x_max-panel_x_min) > 1) {
						av_ctx.beginPath();
						for (let j=panel_x_min;j<panel_x_max;j=j+step) {
							let yi
							if (i==0) {
								yi = current_values[j]
							} else {
								yi = current_values[j] - current_values[panel_x_min-1]
							}

							let p = panel_rect_map(j,yi)
							p[0] = p[0] + x_axis_offset
							if (p_prev) {
								update_aux_closest_segment(symbol, p_prev[0], p_prev[1], p[0], p[1])
							}

							p_prev = p
							if (!first_point_drawn) {
								av_ctx.moveTo(p[0],p[1])
								first_point_drawn = true
							} else {
								av_ctx.lineTo(p[0],p[1])
							}
						}
						if (global.ui.step_select.value != 1) {
							let final_x = panel_x_max-1;
							let final_y;
							if (i==0) {
								final_y = current_values[final_x];
							} else {
								final_y = current_values[final_x] - current_values[panel_x_min-1];
							}
							let final_p = panel_rect_map(final_x, final_y);
							final_p[0]  = final_p[0] + x_axis_offset;
							if (p_prev) {
								update_aux_closest_segment(symbol, p_prev[0], p_prev[1], final_p[0], final_p[1])
							}
							p_prev = final_p;
							av_ctx.lineTo(final_p[0], final_p[1]);
						}
						av_ctx.stroke()
					} else {
						let x = panel_x_min
						let y
						if (i==0) {
							y = current_values[panel_x_min]
						} else {
							y = current_values[panel_x_min] - current_values[panel_x_min-1]
						}

						let p = panel_rect_map(x, y)
						p[0] = p[0] +x_axis_offset
						if (p_prev) {
							update_aux_closest_segment(symbol, p_prev[0], p_prev[1], p[0], p[1])
						}

						p_prev = p
						update_closest_point(symbol, x, p[0], p[1])

						av_ctx.beginPath()
						av_ctx.arc(p[0], p[1], 5, 0, 2 * Math.PI)
						av_ctx.closePath()
						av_ctx.fill()
						av_ctx.stroke()
					}
					av_ctx.restore()
				}

				function draw_group_envelope(group, panel_x_min, panel_x_max, panel_rank) {
					let envelope = prepare_group_envelope(group, panel_x_min, panel_x_max, panel_rank);

					let upper_bound = envelope.upper;
					let lower_bound = envelope.lower;

					av_ctx.save()
					av_ctx.beginPath()
					let p = panel_rect_map(panel_x_min,lower_bound[panel_x_min])
					p[0] = p[0] + x_axis_offset;
					av_ctx.moveTo(p[0],p[1])

					for (let j=panel_x_min+step;j<panel_x_max;j=j+step) {
						let x = j;
						let y;
						if (i==0) {
							y = lower_bound[j];
						} else {
							y = lower_bound[j] - lower_bound[panel_x_min-1];
						}
						p = panel_rect_map(x,y);
						p[0] = p[0] + x_axis_offset;
						av_ctx.lineTo(p[0],p[1]);
					}
					if (global.ui.step_select.value != 1) {
						let final_x = panel_x_max-1;

						let final_lower_y;
						if (i==0) {
							final_lower_y = lower_bound[final_x];
						} else {
							final_lower_y = lower_bound[final_x] - lower_bound[panel_x_min-1];
						}
						let final_lower_p = panel_rect_map(final_x, final_lower_y);
						final_lower_p[0] = final_lower_p[0] + x_axis_offset;
						av_ctx.lineTo(final_lower_p[0],final_lower_p[1]);

						let final_upper_y;
						if (i==0) {
							final_upper_y = upper_bound[final_x];
						} else {
							final_upper_y = upper_bound[final_x] - upper_bound[panel_x_min-1]
						}
						let final_upper_p = panel_rect_map(final_x, final_upper_y);
						final_upper_p[0] = final_upper_p[0] + x_axis_offset;
						av_ctx.lineTo(final_upper_p[0],final_upper_p[1]);
					}

					for (let j=(panel_x_max-(panel_x_max % step)-1); j>=panel_x_min; j=j-step) {
						let x = j;
						let y;
						if (i==0) {
							y = upper_bound[j];
						} else {
							y = upper_bound[j] - upper_bound[panel_x_min-1];
						}
						p = panel_rect_map(x,y);
						p[0] = p[0] + x_axis_offset;
						av_ctx.lineTo(p[0],p[1]);
					}
					if (global.ui.step_select.value != 1) {
						let first_x = panel_x_min;
						let first_y;
						if (i==0) {
							first_y = upper_bound[panel_x_min];
						} else {
							first_y = upper_bound[panel_x_min] - upper_bound[panel_x_min-1]
						}
						let first_p = panel_rect_map(first_x, first_y);
						first_p[0] = first_p[0] + x_axis_offset;
						av_ctx.lineTo(first_p[0],first_p[1]);
					}

					av_ctx.closePath();
					if (group.color) {
						av_ctx.fillStyle = group.color + "88";
					} else {
						av_ctx.fillStyle = "#FFFFFF88";
					}

					av_ctx.fill();
					av_ctx.restore();

				}

				// drawing aux view things

				for (let m=0;m<global.chart_symbols.length;m++) {

					let symbol = global.chart_symbols[m]
					if (symbol.selected) { continue; }
					check_filters(symbol)
					if (symbol.filter == 0) {
						draw_symbol_on_panel(symbol)
					}

				}

				for (let m=0; m<global.selected_symbols.length; m++) {
					let symbol = global.chart_symbols[global.selected_symbols[m]];
					check_filters(symbol)
					if (symbol.filter == 0) {
						draw_symbol_on_panel(symbol);
					}
				}

				if (global.ui.draw_groups_envelope_btn.checked) {
					for (let m=0; m<global.groups.length; m++) {
						let group = global.groups[m];
						if(group.on_chart) {
							draw_group_envelope(group, offset_start, offset_end, i);
						}
					}
				}

				let panel_x_max_ticks = 5;
				let panel_x_ticks = [];
				if ((panel_x_max - panel_x_min) > panel_x_max_ticks) {
					for(let l=0; l<panel_x_max_ticks; l++) {
						let x_tick = panel_x_min+(l*((panel_x_max-panel_x_min)/(panel_x_max_ticks-1)))
						panel_x_ticks.push(x_tick)
					}
				} else {
					for (let l=panel_x_min; l<panel_x_max; l=l+step) {
						panel_x_ticks.push(l);
					}
				}

				for(let l=0; l<panel_x_ticks.length; l++) {
					av_ctx.strokeStyle = "#555555";
					av_ctx.lineWidth   = 1;

					let p0 = panel_rect_map(panel_x_ticks[l], panel_y_min)
					let p1 = panel_rect_map(panel_x_ticks[l], panel_y_max)
					p0[0] = p0[0] + x_axis_offset

					let tick_text
					if (global.aux_view == 'dcdf') {
						tick_text = (panel_x_ticks[l]/panel_x_max).toFixed(2)
					} else if (global.aux_view == 'rcdf') {
						tick_text = Math.floor(panel_x_ticks[l]) + 1;
					}
					av_ctx.save()
					av_ctx.font = "bold 10pt Courier"
					av_ctx.fillStyle = "#FFFFFF"
					av_ctx.fillText(tick_text, p0[0], p0[1]+15);
					av_ctx.restore()
				}

				let panel_y_num_ticks = 9
				let panel_y_ticks = []
				for(let l=0; l<panel_y_num_ticks; l++) {
					let y_tick = panel_y_min+((1.0*l*(panel_y_max-panel_y_min))/(panel_y_num_ticks-1))
					panel_y_ticks.push(y_tick)
				}
				for(let l=0; l<panel_y_ticks.length; l++) {
					av_ctx.strokeStyle = "#555555";
					av_ctx.lineWidth   = 1;

					let p0 = panel_rect_map(panel_x_min, panel_y_ticks[l])
					let p1 = panel_rect_map(panel_x_max, panel_y_ticks[l])

					av_ctx.save()
					av_ctx.font = "bold 10pt Courier"
					av_ctx.fillStyle = "#FFFFFF"
					if (i==0) {
						if(l==(panel_y_ticks.length-1)) {
							av_ctx.fillText(parseInt(panel_y_ticks[l]*82), p0[0]-10, p0[1]+8);
						} else {
							av_ctx.fillText(parseInt(panel_y_ticks[l]*82), p0[0]-10, p0[1]);
						}
					} else {
						if(l==(panel_y_ticks.length-1)) {
							av_ctx.fillText(parseInt(panel_y_ticks[l]*82), p0[0]+10, p0[1]+8);
						} else {
							av_ctx.fillText(parseInt(panel_y_ticks[l]*82), p0[0]+10, p0[1]);
						}
					}
					av_ctx.restore()

				}

				if (global.focused_symbol != null) {

					draw_symbol_on_panel(global.focused_symbol)

					if (global.ref_symbol) {
						// console.log("focused", global.focused_symbol, "reference", global.ref_symbol);
						let ref_foc_group = [global.focused_symbol, global.ref_symbol];
						let ref_foc_envelope = draw_group_envelope(ref_foc_group, offset_start, offset_end, i);
						// console.log(ref_foc_envelope);
					}

				}
			}
		}

	} // aux view drawings

	let p_canvas = global.ui.p_canvas;
	let p_ctx = p_canvas.getContext('2d');
	let projection = get_component('projection');
	p_canvas.width  = document.getElementById('projection_canvas_div').clientWidth;
	p_canvas.height = document.getElementById('projection_canvas_div').clientHeight;

	let p_local_mouse_pos = get_local_position(global.mouse.position, p_canvas)

	p_ctx.clearRect(0, 0, p_canvas.width, p_canvas.height)

	let proj_rect_inf 	  = [0, 0, p_canvas.width, p_canvas.height]
	let proj_rect_margins = [ 5, 15, 5, 5 ]
	let proj_rect 		  = [ proj_rect_inf[0] + proj_rect_margins[SIDE.LEFT],
				  	  		  proj_rect_inf[1] + proj_rect_margins[SIDE.TOP],
				  	  		  proj_rect_inf[2] - proj_rect_margins[SIDE.LEFT] - proj_rect_margins[SIDE.RIGHT],
				  	  		  proj_rect_inf[3] - proj_rect_margins[SIDE.BOTTOM] - proj_rect_margins[SIDE.TOP] ]


	let proj_closest_symbol = null

	{

		p_ctx.fillStyle="#2f3233"

		p_ctx.moveTo(proj_rect_inf[0], proj_rect_inf[1])
		p_ctx.rect(proj_rect[RECT.LEFT], proj_rect[RECT.TOP], proj_rect[RECT.WIDTH], proj_rect[RECT.HEIGHT])
		p_ctx.fill()

		//--------------
		// find x and y range
		//--------------
		let proj_y_min = 10000.0
		let proj_y_max = -10000.0
		let proj_x_min = 10000.0
		let proj_x_max = -10000.0
		let last_valid_value = 1

		for (let i=0;i<global.chart_symbols.length;i++) {
			let symbol = global.chart_symbols[i]

			let proj_coords = symbol.projection_coords

			if (proj_coords == null) {
				continue
			}

			proj_x_min = Math.min(proj_x_min, proj_coords[0])
			proj_x_max = Math.max(proj_x_max, proj_coords[0])
			proj_y_min = Math.min(proj_y_min, proj_coords[1])
			proj_y_max = Math.max(proj_y_max, proj_coords[1])
		}

		if (global.recompute_proj_viewbox) {
			global.proj_viewbox.x 	   	   = proj_x_min
			global.proj_viewbox.y 	   	   = proj_y_min
			global.proj_viewbox.width 	   = proj_x_max - proj_x_min
			global.proj_viewbox.height 	   = proj_y_max - proj_y_min
			global.recompute_proj_viewbox  = false
		} else {
			proj_x_min = global.proj_viewbox.x
			proj_y_min = global.proj_viewbox.y
			proj_x_max = global.proj_viewbox.x + global.proj_viewbox.width
			proj_y_max = global.proj_viewbox.y + global.proj_viewbox.height
		}

		function proj_rect_map(x, y) {
			let px = (proj_rect[RECT.LEFT]+VIEWS_MARGINS) + (1.0 * (x - proj_x_min) / (proj_x_max - proj_x_min)) * (proj_rect[RECT.WIDTH]-(2*VIEWS_MARGINS))
			let py = (proj_rect[RECT.TOP]+VIEWS_MARGINS) + ((proj_rect[RECT.HEIGHT]-(2*VIEWS_MARGINS)) - 1 - (1.0 * (y - proj_y_min) / (proj_y_max - proj_y_min)) * (proj_rect[RECT.HEIGHT]-(2*VIEWS_MARGINS)))
			return [px,py]
		}

		function proj_rect_inverse_map(px, py) {
			let x = ((px - (proj_rect[RECT.LEFT]+VIEWS_MARGINS)) / (proj_rect[RECT.WIDTH]-(2*VIEWS_MARGINS))) * (1.0*(proj_x_max - proj_x_min)) + proj_x_min
			let y = -((((py - (proj_rect[RECT.TOP]+VIEWS_MARGINS) - (proj_rect[RECT.HEIGHT]-(2*VIEWS_MARGINS)) + 1) * (1.0 * (proj_y_max - proj_y_min))) / (proj_rect[RECT.HEIGHT]-(2*VIEWS_MARGINS))) - proj_y_min)
			return [x,y]
		}

		//--------------
		// zoom and pan
		//--------------
		let factor = 1.1
		let ref    = proj_rect_inverse_map(p_local_mouse_pos[0], p_local_mouse_pos[1])
		let y_ref  = ref[1]
		let x_ref  = ref[0]

		if (point_inside_rect(p_local_mouse_pos, proj_rect)) {

			if (global.proj_zoom_y != 0) {

				let h = global.proj_viewbox.height
				let h_

				if (global.proj_zoom_y > 0) {
					h_ = h * factor
				} else {
					h_ = h / factor
				}

				global.proj_viewbox.y = -((h_*((y_ref-global.proj_viewbox.y)/h))-y_ref)
				global.proj_viewbox.height = h_

				proj_y_min = global.proj_viewbox.y
				proj_y_max = global.proj_viewbox.y + global.proj_viewbox.height

				global.zoom_y = 0
			}

			if (global.proj_zoom_x != 0) {

				let w = global.proj_viewbox.width
				let w_

				if (global.proj_zoom_x > 0) {
					w_ = w * factor
				} else {
					w_ = w / factor
				}

				global.proj_viewbox.x = -((w_*((x_ref-global.proj_viewbox.x)/w))-x_ref)
				global.proj_viewbox.width  = w_

				proj_x_min = global.proj_viewbox.x
				proj_x_max = global.proj_viewbox.x + global.proj_viewbox.width

				global.zoom_x = 0
			}

		} else {
			global.zoom_y = 0
			global.zoom_x = 0
		}

		if (global.proj_drag.active) {

			let proj_local_dragstart_pos = get_local_position(global.proj_drag.startpos, p_canvas)

			if (point_inside_rect(proj_local_dragstart_pos, proj_rect)) {

				proj_local_dragstart_pos = proj_rect_inverse_map(proj_local_dragstart_pos[0], proj_local_dragstart_pos[1])

				let local_currmouse_pos = proj_rect_inverse_map(p_local_mouse_pos[0], p_local_mouse_pos[1])

				global.proj_viewbox.x = global.proj_drag.startprojvbox[0] - (local_currmouse_pos[0] - proj_local_dragstart_pos[0])
				global.proj_viewbox.y = global.proj_drag.startprojvbox[1] - (local_currmouse_pos[1] - proj_local_dragstart_pos[1])

				proj_x_min = global.proj_viewbox.x
				proj_x_max = global.proj_viewbox.x + global.proj_viewbox.width

				proj_y_min = global.proj_viewbox.y
				proj_y_max = global.proj_viewbox.y + global.proj_viewbox.height
			}
		}

		//--------------
		// brush states
		//--------------
		if (global.brush_state == BRUSH_STATE.START) {
			reset_selections();
			if (!point_inside_rect(p_local_mouse_pos, proj_rect)) {
				global.brush_state = BRUSH_STATE.INACTIVE
			} else {
				let dm_brush_startpos = proj_rect_inverse_map(p_local_mouse_pos[0],p_local_mouse_pos[1]);

				global.brush = { left:dm_brush_startpos[0], top:dm_brush_startpos[1], width:0, height:0 };
				global.brush_state = BRUSH_STATE.UPDATE;
			}
		} else if (global.brush_state == BRUSH_STATE.UPDATE) {
			if (point_inside_rect(p_local_mouse_pos, proj_rect)) {
				let dm_brush_endpos = proj_rect_inverse_map(p_local_mouse_pos[0],p_local_mouse_pos[1]);

				let width  = dm_brush_endpos[0] - global.brush.left;
				let height = global.brush.top - dm_brush_endpos[1];

				global.brush.width  = width;
				global.brush.height = height;
			}
		}

		//--------------
		// drawing and utils functions for symbols (players)
		//--------------
		let min_distance_threshold = 5 * 5
		let closest_distance = 100000

		function update_closest_point(symbol, px, py) {
			let dx = p_local_mouse_pos[0] - px
			let dy = p_local_mouse_pos[1] - py
			let dist = dx * dx + dy * dy
			if (dist <= min_distance_threshold && dist < closest_distance) {
				proj_closest_symbol = symbol
			}
		}

		function check_symbol_on_brush(symbol) {
			let proj_x = symbol.projection_coords[0];
			let proj_y = symbol.projection_coords[1];

			let inside_x_range;
			if (global.brush.width > 0) {
				inside_x_range = ((global.brush.left <= proj_x) && (proj_x <= global.brush.left+global.brush.width))
			} else {
				inside_x_range = ((global.brush.left+global.brush.width <= proj_x) && (proj_x <= global.brush.left))
			}

			let inside_y_range;
			if (global.brush.height < 0) {
				inside_y_range = ((global.brush.top <= proj_y) && (proj_y <= global.brush.top-global.brush.height));
			} else {
				inside_y_range = ((global.brush.top-global.brush.height <= proj_y) && (proj_y <= global.brush.top));
			}

			return (inside_x_range && inside_y_range)
		}

		function draw_symbol_projection(symbol) {

			let idx = global.chart_symbols.indexOf(symbol)
			if (symbol.projection_coords == null) {
				return
			}

			if (document.getElementById('protos_only_checkbox').checked) {
				if (!symbol.proto && symbol != global.focused_symbol) {
					return;
				}
			}

			if (document.getElementById('selected_only_checkbox').checked) {
				if (!symbol.selected) { return; }
			}

			if (!check_ft_pos_filters(symbol)) { return; }


			if (global.brush !== undefined) {
				if (symbol.selected == false) {
					if (check_symbol_on_brush(symbol)) {
						symbol.selected = true;
						global.selected_symbols.push(idx);
						if (symbol.ft_ui_col) { symbol.ft_ui_col.style.fontWeight = 'bold' }
					}
				}
				// if (check_symbol_on_brush(symbol)) {
				// 	symbol.selected = true;
				// } else {
				// 	symbol.selected = false;
				// }
			}

			let point_color;
			let point_focused_color;

			switch (global.colorby) {
				case 'default': {
					point_color = "#FFFFFF44";
					point_focused_color = global.chart_colors[idx];
					} break;
				case 'position': {
					point_color = POSITION_COLORS[symbol.position[0]];
					point_focused_color = POSITION_COLORS[symbol.position[0]];
					} break;
				case 'games_played': {
					let seq_scale_idx 	 = (Object.keys(symbol.data).length / MAX_GP) * (SEQUENTIAL_COLORS.length-1);
					let seq_scale_idx_fl = Math.floor(seq_scale_idx);

					let a = seq_scale_idx_fl;
					let b = Math.min(a+1, SEQUENTIAL_COLORS.length-1);

					let lambda = 1-(seq_scale_idx-seq_scale_idx_fl);
					let color  = hex_lerp(SEQUENTIAL_COLORS[a], SEQUENTIAL_COLORS[b], lambda);

					point_color	 		= color;
					point_focused_color = color;
					} break;
				default: {
					let sr = global.stats_ranges[global.colorby];
					let s  = symbol.summary[global.colorby];

					let seq_scale_idx 	 = (s - sr[0]) / (sr[1] - sr[0]) * (SEQUENTIAL_COLORS.length-1);
					let seq_scale_idx_fl = Math.floor(seq_scale_idx);

					let a = seq_scale_idx_fl;
					let b = Math.min(a+1, SEQUENTIAL_COLORS.length-1);

					let lambda = 1-(seq_scale_idx-seq_scale_idx_fl);
					let color  = hex_lerp(SEQUENTIAL_COLORS[a], SEQUENTIAL_COLORS[b], lambda);

					point_color 		= color;
					point_focused_color = color;
					} break;
			}

			if (symbol.group) {
				point_color = symbol.group.color;
			}

			if (global.selected_symbols.length > 0 && (!symbol.selected && (symbol !== global.focused_symbol))) {
				if (point_color !== "#FFFFFF44") {
					point_color += '44'
				}
			}

			let x = symbol.projection_coords[0];
			let y = symbol.projection_coords[1];

			let p = proj_rect_map(x, y);
			update_closest_point(symbol, p[0], p[1]);

			p_ctx.save();
			p_ctx.fillStyle = point_color;
			p_ctx.beginPath()
			if ((symbol == global.focused_symbol) || symbol.selected) {
				if (symbol.group) {
					p_ctx.fillStyle = symbol.group.color;
				} else {
					p_ctx.fillStyle = point_focused_color
				}
				p_ctx.strokeStyle = "#FFFFFFAA"
				p_ctx.arc(p[0], p[1], 6, 0, 2 * Math.PI)
			} else {
				p_ctx.strokeStyle = point_color
				p_ctx.arc(p[0], p[1], 4, 0, 2 * Math.PI)
			}
			p_ctx.closePath()
			p_ctx.fill()
			p_ctx.stroke()

			p_ctx.restore()

		}

		//--------------
		// drawings
		//--------------
		p_ctx.save()

		p_ctx.moveTo(proj_rect[RECT.LEFT],proj_rect[RECT.TOP])
		p_ctx.beginPath()
		p_ctx.rect(proj_rect[RECT.LEFT],proj_rect[RECT.TOP],proj_rect[RECT.WIDTH],proj_rect[RECT.HEIGHT])
		p_ctx.clip()

		if ((global.brush !== undefined)) {
			if (global.brush.width !== 0 && global.brush.height !== 0 && global.brush_state !== BRUSH_STATE.INACTIVE) {
				let cv_brush_startpos = proj_rect_map(global.brush.left, global.brush.top);
				let cv_brush_endpos   = proj_rect_map(global.brush.left + global.brush.width, global.brush.top + global.brush.height);

				let brush_rect = [cv_brush_startpos[0], cv_brush_startpos[1], cv_brush_endpos[0]-cv_brush_startpos[0], cv_brush_startpos[1]-cv_brush_endpos[1]];
				global.brush.rect = brush_rect;

				p_ctx.strokeStyle = "#FFFFFF";
				p_ctx.strokeRect(brush_rect[RECT.LEFT], brush_rect[RECT.TOP], brush_rect[RECT.WIDTH], brush_rect[RECT.HEIGHT]);

			}
		}

		for (let m=0;m<global.chart_symbols.length;m++) {

			let symbol = global.chart_symbols[m]
			if (symbol.selected) { continue; }
			// check_filters(symbol)
			draw_symbol_projection(symbol);

		}

		for (let m=0; m<global.selected_symbols.length; m++) {

			let symbol = global.chart_symbols[global.selected_symbols[m]];
			draw_symbol_projection(symbol);

		}

		p_ctx.restore() //PROJ RECT CLIP RESTORE

		if (global.focused_symbol != null) {
			draw_symbol_projection(global.focused_symbol)

			if (global.select_mode_selected) {
				global.focused_symbol.selected = !global.focused_symbol.selected;
				if (global.focused_symbol.selected) {
					global.selected_symbols.push(global.chart_symbols.indexOf(global.focused_symbol));
					global.focused_symbol.ui_col.style.fontWeight = 'bold';
					if (global.focused_symbol.ft_ui_col) { global.focused_symbol.ft_ui_col.style.fontWeight = 'bold'; }
				} else {
					remove_element_from_list(global.chart_symbols.indexOf(global.focused_symbol), global.selected_symbols);
					global.focused_symbol.ui_col.style.fontWeight = 'initial';
					if (global.focused_symbol.ft_ui_col) { global.focused_symbol.ft_ui_col.style.fontWeight = 'initial'; }
				}
			}

			let symbol = global.focused_symbol
			let proj_text = `${global.focused_symbol.name} // GP: ${Object.keys(global.focused_symbol.data).length} //  TOTALS: `

			for (let i=0; i<global.chosen_stats.length; i++) {
				let stat = global.chosen_stats[i]
				if (i == global.chosen_stats.length-1) {
					proj_text += `${stat}: ${symbol.summary[stat]}`
				} else {
					proj_text += `${stat}: ${symbol.summary[stat]} // `
				}
			}

			p_ctx.font = '14px Monospace';
			p_ctx.fillStyle = "#FFFFFF"

			p_ctx.fillText(proj_text, proj_rect_margins[1], proj_rect[1]+15);
		}


	} // projection drawings

	if (lc_closest_symbol != null) {
		global.focused_symbol = lc_closest_symbol
	} else if (aux_view_closest_symbol != null) {
		global.focused_symbol = aux_view_closest_symbol
	} else {
		global.focused_symbol = proj_closest_symbol
	}

}

function set_ui_components()
{
	// -------
	// UPDATE 2021-04-22: setting components
	// -------
	{
		// -------
		// default layout
		// -------
		let c_0     = new Node('root', 1, NODE_ORIENTATION_HORIZONTAL)
		let c_l     = new Node('l', 1, NODE_ORIENTATION_VERTICAL)
		let c_l_t   = new Node('controls')
		let c_l_b   = new Node('table')
		let c_r     = new Node('r', 5, NODE_ORIENTATION_VERTICAL)
		let c_r_t   = new Node('line_chart')
		let c_r_b   = new Node('rb', 1, NODE_ORIENTATION_HORIZONTAL)
		let c_r_b_l = new Node('aux_view')
		let c_r_b_r = new Node('projection')

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
		// -------
		// layout w/ full table (for clusters); groups table
		// -------
		let c_0     = new Node('root', 1, NODE_ORIENTATION_HORIZONTAL)
		let c_l     = new Node('l', 1, NODE_ORIENTATION_VERTICAL)
		let c_l_t   = new Node('full_table', 9)
		let c_l_b   = new Node('groups_table')
		let c_r     = new Node('r', 1, NODE_ORIENTATION_VERTICAL)
		let c_r_t   = new Node('line_chart')
		let c_r_b   = new Node('rb', 1, NODE_ORIENTATION_HORIZONTAL)
		let c_r_b_l = new Node('aux_view')
		let c_r_b_r = new Node('projection')

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
		// -------
		// default layout w/ full table
		// -------
		let c_0     = new Node('root', 1, NODE_ORIENTATION_HORIZONTAL)
		// let c_l     = new Node('l', 1, NODE_ORIENTATION_VERTICAL)
		// let c_l_t   = new Node('controls')
		let c_l     = new Node('full_table')
		let c_r     = new Node('r', 3, NODE_ORIENTATION_VERTICAL)
		let c_r_t   = new Node('line_chart')
		let c_r_b   = new Node('rb', 1, NODE_ORIENTATION_HORIZONTAL)
		let c_r_b_l = new Node('aux_view')
		let c_r_b_r = new Node('projection')

		c_0.add_child(c_l)
		c_0.add_child(c_r)

		// c_l.add_child(c_l_t)
		// c_l.add_child(c_l_b)

		c_r.add_child(c_r_t)
		c_r.add_child(c_r_b)

		c_r_b.add_child(c_r_b_l)
		c_r_b.add_child(c_r_b_r)

		global.layout_modes.push(c_0)
	}

	global.layout_index = 0;

	//target color: #6b6f71 (with margins to see each component)
	let controls = document.createElement('div');
	controls.style='background-color:#777777; overflow:auto'

	let table = document.createElement('div');
	table.style='background-color:#999999; overflow:auto'

	let full_table = document.createElement('div');
	full_table.style='background-color:#999999; overflow:auto; padding:10'

	let groups_table = document.createElement('div');
	groups_table.style='background-color:#333333; overflow:auto'

	let line_chart = document.createElement('div');
	line_chart.style='background-color:#555555; overflow:auto; display:flex; flex-direction:column;'

	let aux_view = document.createElement('div');
	aux_view.style='background-color:#AAAAAA; overflow:auto; display:flex; flex-direction:column;'

	let projection = document.createElement('div');
	projection.style='background-color:#000000; overflow:auto; display:flex; flex-direction:column;'

	global.components = [
		{ component: controls, position: 'controls' },
		{ component: table, position: 'table' },
		{ component: full_table, position: 'full_table' },
		{ component: groups_table, position: 'groups_table'},
		{ component: line_chart, position: 'line_chart' },
		{ component: aux_view, position: 'aux_view' },
		{ component: projection, position: 'projection' }
	]

	document.body.appendChild(controls)
	document.body.appendChild(table)
	document.body.appendChild(full_table)
	document.body.appendChild(groups_table)
	document.body.appendChild(line_chart)
	document.body.appendChild(aux_view)
	document.body.appendChild(projection)

}

function update_ui()
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

	// if (global.layout_index == 1) {
	// 	global.ui.draw_aux_view_type_grid.style.visibility="hidden"
	// } else {
	// 	global.ui.draw_aux_view_type_grid.style.visibility="visible"
	// }

	// setTimeout(update, MSEC_PER_FRAME)
}

function update()
{
	process_event_queue()

	update_ui();
	update_ts(); // draw ts

	// schedule update to process events
	setTimeout(update, MSEC_PER_FRAME)
}

async function main()
{
	let result
	try {

		const { instance } = await WebAssembly.instantiateStreaming( fetch("tsvis.wasm") );

		let heap_size = instance.exports.memory.buffer.byteLength
		global.tsvis_wasm_module = instance
		global.tsvis_wasm_module.exports.tsvis_heap_init(heap_size)

		let result = await fetch('http://localhost:8888/desc')
		let symbol_names = await result.json()

		let symbols = []
		for (let i=0;i<symbol_names.length;i++) {
			symbols.push({ name:symbol_names[i], position:null, ui_row:null, ui_col:null,
						   on_table:true, on_chart:false, data: null,
						   ts_current_values: null, ed_rank:null, mbd_rank:null,
						   filter:0, selected:false, group:null, proto:false })
		}
		global.symbols = symbols
		global.toggle_state = 0

		install_event_listener(window, "keydown", window, EVENT.KEYDOWN)
		install_event_listener(window, "mousedown", window, EVENT.MOUSEDOWN)
		install_event_listener(window, "mousemove", window, EVENT.MOUSEMOVE)
		install_event_listener(window, "mouseup", window, EVENT.MOUSEUP)
		set_ui_components()
		fill_ui_components()
		setTimeout(update, MSEC_PER_FRAME)

	} catch (e) {
		console.log("Fatal Error: couldn't download data")
		return
	}
}
