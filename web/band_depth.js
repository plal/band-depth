//------------------------------------------------------------------------------
// UTIL
//------------------------------------------------------------------------------
function u_parse_tables(st, field_delim, record_delim, table_delim)
{
	let i = 0
	let n = st.length
	let results = []

	//
	// header
	//
	while (i!=n) {
		let field_positions = [i]
		for (;;) {
			if (i < n) {
				let ch=st[i]
				++i
				if (ch == field_delim) {
					field_positions.push(i) // start of next field
				} else if (ch == record_delim) {
					field_positions.push(i) // start of next row
					break
				} else if (ch == table_delim) {
					console.log('[u_parse_tables] found table delimiter in an unexpected place')
					return undefined // didn't expect table delim in a header
				}
			} else {
				field_positions.push(i) // start of next row
				break
			}
		}
		let num_fields = field_positions.length - 1
		let result = { columns:num_fields, rows:0, column_names:[], column_values:[] }

		results.push(result)

		for (let j=0;j<num_fields;j++) {
			result.column_names.push(st.substring(field_positions[j], field_positions[j+1]-1))
			result.column_values.push([])
		}
		// console.log(result)
		let row_index=-1
		while (i != n) {

			if (st[i] == table_delim) {
				++i
				break
			}

			row_index++
			field_positions.length = 0
			field_positions.push(i)
			for (;;) {
				if (i < n) {
					let ch=st[i]
					++i
					if (ch == field_delim) {
						field_positions.push(i) // start of next field
					} else if (ch == record_delim) {
						field_positions.push(i) // start of next row
						break
					} else if (ch == table_delim) {
						console.log('[u_parse_tables] found table delimiter in an unexpected place')
						return undefined
					}
				} else {
					field_positions.push(i) // start of next row
					break
				}
			}
			let record_num_fields = field_positions.length - 1
			// console.log(result)
			if (record_num_fields == num_fields) {
				for (let j=0;j<num_fields;j++) {
					result.column_values[j].push(st.substring(field_positions[j], field_positions[j+1]-1))
				}
			} else {
				console.log("[warning] num fields on row",(row_index+1),"doesn't match with header number of fields. discarding row.")
			}
		}
		result.rows = row_index + 1;
	}
	return results
}


//------------------------------------------------------------------------------
// MAIN
//------------------------------------------------------------------------------

const MSEC_PER_FRAME = 33

//depth values order: original, fast, tdigest, original modified, fast modified, tdigest modified, sliding (wsize 15), extremal
const DEPTH_od        = 0
const DEPTH_od_time   = 1
const DEPTH_fd        = 2
const DEPTH_fd_time   = 3
const DEPTH_td        = 4
const DEPTH_td_time   = 5
const DEPTH_omd       = 6
const DEPTH_omd_time  = 7
const DEPTH_fmd       = 8
const DEPTH_fmd_time  = 9
const DEPTH_tmd       = 10
const DEPTH_tmd_time  = 11
const DEPTH_sd        = 12
const DEPTH_sd_time   = 13
const DEPTH_ed        = 14

global = { ui: {}, mouse: { position:[0,0], last_position:[0,0] }, events: [], draw_curves: true, draw_bands: true, coef: 1 }
data   = { records: [], focused_timestep: null, focused_record: null }



function prepare_band(rank, coef) {
	let n = data.num_records
	let m = Math.trunc(data.num_records * coef)
	let a = n - m
	let b = n
	
	let ymin = new Array(data.timesteps)
	let ymax = new Array(data.timesteps)

	for (let j=0;j<data.num_timesteps;j++) {
		let y = data.records[rank[a]].values[j]
		ymin[j] = y
		ymax[j] = y
		for (let k=a+1;k<b;++k) {
			y = data.records[rank[k]].values[j]
			ymin[j] = Math.min(y,ymin[j])
			ymax[j] = Math.max(y,ymax[j])
		}
	}

	return [ymin, ymax]

}


function prepare_data() {
	//console.log(outputs.rows, outputs.columns)

	// read the two tables
	let inputs  = u_parse_tables(data_input, '|', '\n', String.fromCharCode(1))[0]
	let outputs = u_parse_tables(data_output, '|', '\n', String.fromCharCode(1))[0]

	if (inputs.rows != outputs.rows) { throw Exception("SizeMismatch") }

	let rows     = inputs.rows
	let in_cols  = inputs.columns
	let out_cols = outputs.columns
	let records = []
	for(let i=0; i<rows; i++) {
		let tseries = {values:[], depths: []}
		for(let j=0; j<in_cols;j++) {
			tseries.values.push(parseFloat(inputs.column_values[j][i]))
		}
		//depth values order: original, fast, tdigest, original modified, fast modified, tdigest modified, sliding (wsize 15), extremal
		for(let j=0; j<out_cols;j++) {
			//console.log(j)
			tseries.depths.push(parseFloat(outputs.column_values[j][i]));
		}
		records.push(tseries)
	}
	data.records =  records
	data.num_timesteps = in_cols
	data.num_records = rows

	// create permutation for each depth we care
	let ed_rank = new Array(data.num_records)
	let ed_inverse_rank = new Array(data.num_records)
	for (let i=0;i<data.num_records;i++) {
		ed_rank[i] = i
	}
	ed_rank.sort(function(a,b) {
		// return 0.5 - Math.random()
		return data.records[a].depths[DEPTH_ed] - data.records[b].depths[DEPTH_ed] 
	})

	for (let i=0;i<data.num_records;i++) {
		ed_inverse_rank[ed_rank[i]] = i
	}
	data.ed_rank = ed_rank
	data.ed_inverse_rank = ed_inverse_rank

	// ed_bands
	let ed_bands = { coef: [], ymin: [], ymax: []}
	let delta = 1.0/12
	for (let i=0;i<11;++i) {
		let coef = 1 - delta - delta * i
		x = prepare_band(data.ed_rank, coef)
		ed_bands.coef.push(coef)
		ed_bands.ymin.push(x[0])
		ed_bands.ymax.push(x[1])
	}

	data.ed_bands = ed_bands

	console.log("bands")



	// // create permutation for each depth we care
	// let ed_rank = new Array(data.num_records)
	// for (let i=0;i<data.num_records;i++) {
	// 	ed_rank[i] = i
	// }
	// ed_rank.sort(function(a,b) {
	// 	return data.records[a].depths[DEPTH_EXTREMAL] - data.records[b].depths[DEPTH_EXTREMAL] 
	// })
}



function event_loop()
{
	// for (;;) {
	// 	events = get_events()
	// 	update(events)
	// 	render()
	// }
}

function prepare_ui()
{
	// main_div
	let main_div = document.createElement('div')
	global.ui.main_div = main_div
	main_div.id = 'main_div'
	main_div.style = 'width:100%; height:100%'

	// main_canvas
	let main_canvas = main_div.appendChild(document.createElement('canvas'))
	global.ui.main_canvas = main_canvas
	main_canvas.style='position: absolute; left:0px; top:0px; z-index:1;'
	main_canvas.id = 'main_canvas'
	main_canvas.tabindex = '1'

	var body = document.getElementsByTagName('body')[0]
	global.ui.body = body
	body.style.margin='0px'
	body.appendChild(main_div)
	// main_div.appendChild(main_canvas)


	global.ui.main_div.onmousemove = function(e){
		global.events.push(e)
	}

	global.ui.main_div.onmouseup= function(e){
		global.events.push(e)
	}

	global.ui.main_div.onmousedown = function(e){
		global.events.push(e)
	}

	window.onkeydown = function(e) {
		global.events.push(e)
	}

}

function update_timeseries_canvas()
{
	let canvas = global.ui.main_canvas
	let ctx = canvas.getContext('2d')
	canvas.width  = window.innerWidth;
	canvas.height = window.innerHeight;
	// console.log('canvas w,h: ',canvas.width,canvas.height)

	let rect = [0, 0, canvas.width, canvas.height]

	//
	// @todo let user rescale the tseries from the bottom by dragging the plot
	// make this rect global
	// general area of the plot
	//
	// let w = global.settings.tseries_panel[2]
	// let h = global.settings.tseries_panel[3]
	// let pos = [canvas.width-w,canvas.height-h-LAYOUT_STATUS_BAR_HEIGHT-2]
	// let rect = [pos[0], pos[1], w, h]
	// update the tseries_panel so that the position is adjusted
	// global.settings.tseries_panel = rect.slice()

	// console.log('version updated: '+global.version)
	ctx.clearRect(0,0,canvas.width, canvas.height)




	let num_records   = data.records.length	
	let num_timesteps = data.records[0].values.length

	// find ranges of the time series
	let x_min_value = 0
	let x_max_value = num_timesteps-1
	let y_min_value = data.records[0].values[0]
	let y_max_value = y_min_value
	for (let i=0;i<num_records;i++) {
		let values = data.records[i].values
		for (let j=0;j<num_timesteps;j++) {
			let v = values[j]
			y_min_value = Math.min(v, y_min_value)
			y_max_value = Math.max(v, y_max_value)
		}
	}

	let margin = 10
	let tseries_rect = [ rect[0] + margin, rect[1] + margin, rect[2] - 2*margin, rect[3] - 2*margin]

	function map(x, y) {
		let px = tseries_rect[0] + (1.0 * (x - x_min_value) / (x_max_value - x_min_value)) * tseries_rect[2]
		let py = tseries_rect[1] + (tseries_rect[3] - 1 - (1.0 * (y - y_min_value) / (y_max_value - y_min_value)) * tseries_rect[3])
		return [px,py]
	}

	if (global.draw_bands) {
		// draw bands
		// let colors = ['#fff5f0','#fee0d2','#fcbba1','#fc9272','#fb6a4a','#ef3b2c','#cb181d','#a50f15','#67000d']
		let colors = ['#67001f','#b2182b','#d6604d','#f4a582','#fddbc7','#f7f7f7','#d1e5f0','#92c5de','#4393c3','#2166ac','#053061']
		for (let i=0;i<colors.length;i++) {
			let r = parseInt(colors[i].slice(1,3),16)
			let g = parseInt(colors[i].slice(3,5),16)
			let b = parseInt(colors[i].slice(5,7),16)
			let o = 0.7
			r = Math.trunc(r * o + 255 * (1-o)).toString(16)
			g = Math.trunc(g * o + 255 * (1-o)).toString(16)
			b = Math.trunc(b * o + 255 * (1-o)).toString(16)
			r = r.length == 2 ? r : ("0"+r)
			g = g.length == 2 ? g : ("0"+g)
			b = b.length == 2 ? b : ("0"+b)
			let color = "#" + r + g + b
			colors[i] = color
			// colors[i] = colors[i] + '4f'
		}
		let bands = data.ed_bands
		let num_bands = bands.coef.length
		for (let i=0;i<num_bands;i++) {
			let coef = bands.coef[i]
			let ymin = bands.ymin[i]
			let ymax = bands.ymax[i]
			ctx.save()
			ctx.beginPath()
			let p = map(0,ymin[0])
			ctx.moveTo(p[0],p[1])
			for (let j=1;j<data.num_timesteps;j++) {
				p = map(j,ymin[j])
				ctx.lineTo(p[0],p[1])
			}
			for (let j=data.num_timesteps-1;j>=0;j--) {
				p = map(j,ymax[j])
				ctx.lineTo(p[0],p[1])
			}
			ctx.closePath()
			ctx.fillStyle=colors[i]
			ctx.fill()
			ctx.restore()
		}
	}


	let closest_timestep = null
	let closest_record  = null
	let min_distance_threshold = 5 * 5
	let closest_distance = 100000
	function update_closest_point(record, timestep, px, py) {
		let dx = global.mouse.position[0] - px
		let dy = global.mouse.position[1] - py
		let dist = dx * dx + dy * dy
		if (dist <= min_distance_threshold && dist < closest_distance) {
			closest_record = record
			closest_timestep = timestep
		}
	}

	//
	// render timeseries
	//

	function draw_timeseries(i) {
		let values = data.records[i].values
		ctx.beginPath()
		let y0 = values[0]
		let p = map(0,y0)
		update_closest_point(i, 0, p[0], p[1])
		ctx.moveTo(p[0],p[1])
		for (let j=1;j<num_timesteps;j++) {
			let yi = values[j]
			p = map(j,yi)
			update_closest_point(i, j, p[0], p[1])
			ctx.lineTo(p[0],p[1])
		}
		ctx.stroke()
	}

	function draw_point(i, j, r) {
		let values = data.records[i].values
		let yi = values[j]
		p = map(j,yi)
		update_closest_point(i, j, p[0], p[1])
		ctx.beginPath()
		ctx.arc(p[0],p[1],r,0,Math.PI*2,true)
		ctx.stroke()
	}

	if (global.draw_curves) {
		ctx.strokeStyle = '#0000005f'
		ctx.lineWidth  = 1

		let n = num_records
		let k = Math.trunc(global.coef * n)
		let a = n - k
		let b = n

		for (let i=a;i<b;i++) {
			let curve_i = data.ed_rank[i]
			if (data.focused_record == null || (curve_i != data.focused_record)) {
				draw_timeseries(curve_i)
			}
		}

		if (data.focused_record != null) {
			ctx.strokeStyle = '#8800005f'
			ctx.lineWidth  = 3
			draw_timeseries(data.focused_record)

			ctx.strokeStyle = '#880000ff'
			draw_point(data.focused_record, data.focused_timestep, 3)

			// print the details of the focused timeseries
			let record = data.records[data.focused_record]
			let value = record.values[data.focused_timestep]
			let date = new Date(new Date(2018,0,1).getTime() + (1000 * 24 * 60 * 60 * data.focused_record))
			let rank = data.ed_inverse_rank[data.focused_record] + 1
			let text = `coef: ${global.coef}  ID: ${data.focused_record} ${date.toDateString()} ${data.focused_timestep}h  #trips: ${value}  ED: ${record.depths[DEPTH_ed]} r${rank}`
			ctx.font = '24px Monospace';
			ctx.textAlign = 'right';
			ctx.fillText(text, rect[0] + rect[2] - 10, rect[1] + rect[3] - 12);
		}
	}

	// update focused record
	data.focused_record   = closest_record
	data.focused_timestep = closest_timestep
}

const KEY_0=48
const KEY_1=49
const KEY_2=50
const KEY_3=51
const KEY_4=52

function process_events()
{
	for (let i=0;i<global.events.length;++i) {
		let e = global.events[i]
		console.log(e.type)

		switch(e.type) {
			case "mousemove": {
				global.mouse.position      = [e.x, e.y]
				global.mouse.last_position = global.mouse.position
				// console.log(e.type)
			} break
			case "mousedown": {
				// console.log(e.type)
			} break
			case "mouseup": {
				// console.log(e.type)
			} break
			case "keydown": {
				if (e.keyCode == KEY_1) {
					global.draw_curves = !global.draw_curves
				} else if (e.keyCode == KEY_2) {
					global.draw_bands= !global.draw_bands
				} else if (e.keyCode == KEY_3) {
					global.coef = global.coef - 0.01
					if (global.coef < 0) global.coef = 0
				} else if (e.keyCode == KEY_4) {
					global.coef = global.coef + 0.01
					if (global.coef > 1) global.coef = 1
				}
			} break
		}

		// if (e == 
		// // console.log('update from ' + global.mouse.current + ' to ' + [e.x, e.y])
		// global.mouse.position      = [e.x, e.y]
		// global.mouse.last_position = global.mouse.position
	}
	global.events.length = 0
}

function update()
{
	// event processing
	process_events()

	update_timeseries_canvas()

	setTimeout(update, MSEC_PER_FRAME)
}

function main()
{
	prepare_data()

	prepare_ui()

	setTimeout(update, MSEC_PER_FRAME)
}

