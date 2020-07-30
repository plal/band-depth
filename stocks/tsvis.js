"use strict";

const EVENT= {
	FILTER: "event_filter",
	TOGGLE_SYMBOL: "event_toggle_symbol",
	UPDATE_START_DATE: "event_update_start_date",
	UPDATE_END_DATE: "event_update_end_date",
	UPDATE_NORM_DATE: "event_update_norm_date",
	RUN_EXTREMAL_DEPTH_ALGORITHM: "even_run_extremal_depth_algorithm",
	MOUSEMOVE: "event_mousemove",
	KEYDOWN: "event_keydown"
}

var global = {
	ui:{},
	symbols: [],
	chart_symbols: [],
	chart_colors: [],
	events: [],
	date_start: "2020-01-01",
	date_end: "2020-07-18",
	date_norm: "2020-07-15",
	mouse: { position:[0,0], last_position:[0,0] },
	color: { colors:['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628'], counter:0 },
	focused_symbol: null,
	focused_date: null,
	key_update_norm: false,
	key_update_start: false,
	key_update_end: false
}

function install_event_listener(component, raw_event_type, context, event_type)
{
	component.addEventListener(raw_event_type, function(e) {
		//console.log(e.x, e.y)
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

function pick_color() {
	let idx = global.color.counter%global.color.colors.length
	let color 	= global.color.colors[idx]
	global.color.counter = global.color.counter + 1

	return color
}

function get_local_mouse_pos(component) {
	var rect = component.getBoundingClientRect();

	return [(global.mouse.position[0] - rect.left), (global.mouse.position[1] - rect.top)]
}

function drawTextBG(ctx, txt, x, y) {

    ctx.save();

    // set font
    ctx.font = "12pt Courier";

    // draw text from top - makes life easier at the moment
    ctx.textBaseline = 'top';
	ctx.textAlign = 'left'

    /// color for background
    ctx.fillStyle = '#000000';

    /// get width of text
    var width = ctx.measureText(txt).width;

    /// draw background rect assuming height of font
    ctx.fillRect(x, y, width, parseInt(ctx.font, 12));

    /// text color
    ctx.fillStyle = '#FFFFFF';

    /// draw text on top
    ctx.fillText(txt, x, y);

    /// restore original state
    ctx.restore();
}

async function download_symbol_data(symbol)
{
	let result
	try {
		let result = await fetch('http://localhost:8888/get?p='+symbol.name)
		let data   = await result.json()
		let dict = {}
		for (let i=0;i<data.data[0].close.length;i++) {
			let offset = date_offset(data.data[0].date[i])
			let price = parseFloat(data.data[0].close[i])
			dict[offset] = price
		}
		symbol.data = dict
	} catch (e) {
		console.log("Fatal Error: couldn't download symbol data" + symbol.name)
		return
	}
}

function prepare_ui()
{

	let start_date_input = document.createElement('input')
	global.ui.start_date_input = start_date_input
	start_date_input.setAttribute("type","date")
	start_date_input.defaultValue = "2020-01-01"
	start_date_input.classList.add('date_input')
	start_date_input.id = 'start_date_input'
	install_event_listener(start_date_input, 'change', start_date_input, EVENT.UPDATE_START_DATE)


	let start_date_label = document.createElement('label')
	global.ui.start_date_label = start_date_label
	start_date_label.classList.add('date_input_label')
	start_date_label.setAttribute("for", start_date_input)
	start_date_label.innerHTML = "start"

	let start_date_grid = document.createElement('div')
	global.ui.start_date_grid = start_date_grid
	start_date_grid.id = start_date_grid
	start_date_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around'
	start_date_grid.appendChild(start_date_label)
	start_date_grid.appendChild(start_date_input)

	let end_date_input = document.createElement('input')
	global.ui.end_date_input = end_date_input
	end_date_input.setAttribute("type","date")
	end_date_input.defaultValue = "2020-07-18"
	end_date_input.classList.add('date_input')
	end_date_input.id = 'end_date_input'
	install_event_listener(end_date_input, 'change', end_date_input, EVENT.UPDATE_END_DATE)

	let end_date_label = document.createElement('label')
	global.ui.end_date_label = end_date_label
	end_date_label.setAttribute("for", end_date_input)
	end_date_label.classList.add('date_input_label')
	end_date_label.innerHTML = "end"

	let end_date_grid = document.createElement('div')
	global.ui.end_date_grid = end_date_grid
	end_date_grid.id = end_date_grid
	end_date_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around'
	end_date_grid.appendChild(end_date_label)
	end_date_grid.appendChild(end_date_input)

	let norm_date_input = document.createElement('input')
	global.ui.norm_date_input = norm_date_input
	norm_date_input.setAttribute("type","date")
	norm_date_input.defaultValue = "2020-07-15"
	norm_date_input.classList.add('date_input')
	norm_date_input.id = 'norm_date_input'
	install_event_listener(norm_date_input, 'change', norm_date_input, EVENT.UPDATE_NORM_DATE)

	let norm_date_label = document.createElement('label')
	global.ui.norm_date_label = norm_date_label
	norm_date_label.setAttribute("for", norm_date_input)
	norm_date_label.classList.add('date_input_label')
	norm_date_label.innerHTML = "norm"

	let norm_date_grid = document.createElement('div')
	global.ui.norm_date_grid = norm_date_grid
	norm_date_grid.id = norm_date_grid
	norm_date_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around'
	norm_date_grid.appendChild(norm_date_label)
	norm_date_grid.appendChild(norm_date_input)

	let filter_input = document.createElement('input')
	global.ui.filter_input = filter_input
	filter_input.setAttribute("type","text")
	filter_input.id = 'filter_input'
	filter_input.style = 'position:relative; width:100%; margin:2px; border-radius:2px; background-color:#FFFFFF; font-family:Courier; font-size:14pt;'
	install_event_listener(filter_input, 'change', filter_input, EVENT.FILTER)

	let extremal_depth_btn = document.createElement('input')
	extremal_depth_btn.type = "button"
	extremal_depth_btn.value = "ED"
	install_event_listener(extremal_depth_btn, 'click', extremal_depth_btn, EVENT.RUN_EXTREMAL_DEPTH_ALGORITHM)

	let filter_btns_grid = document.createElement('div')
	global.ui.filter_btns_grid = filter_btns_grid
	filter_btns_grid.id = filter_btns_grid
	filter_btns_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around'
	filter_btns_grid.appendChild(filter_input)
	filter_btns_grid.appendChild(extremal_depth_btn)

	let symbols_table_div = document.createElement('div')
	global.ui.symbols_table_div = symbols_table_div
	symbols_table_div.id = 'symbols_table_div'
	symbols_table_div.style = 'position:relative; width:100%; height:100%; margin:2px; overflow:auto; border-radius:2px; background-color:#FFFFFF'

	let left_panel = document.createElement('div')
   	global.ui.left_panel = left_panel
   	left_panel.id = 'left_panel'
   	left_panel.style = 'display:flex; flex-direction:column; background-color:#2f3233; align-content:space-around;'
	left_panel.appendChild(start_date_grid)
	left_panel.appendChild(end_date_grid)
	left_panel.appendChild(norm_date_grid)
   	left_panel.appendChild(filter_btns_grid)
   	left_panel.appendChild(symbols_table_div)

	let table = symbols_table_div.appendChild(document.createElement('table'))
	global.ui.symbols_table = table
	table.style = 'position:block; width:100%; heigth: 100% !important;'
	for (let i=0;i<global.symbols.length;i++) {
		let symbol = global.symbols[i]
		let row = table.appendChild(document.createElement('tr'))
		let col = row.appendChild(document.createElement('td'))
		col.innerText = symbol.name
		col.style = "cursor: pointer"
		col.style.fontFamily = 'Courier'
		col.style.fontSize = '14pt'
		col.style.color ="#6b6f71"
		symbol.ui_row = row
		symbol.ui_col = col
		install_event_listener(symbol.ui_col, 'click', symbol, EVENT.TOGGLE_SYMBOL)
	}

	let ts_div = document.createElement('div')
	global.ui.ts_div = ts_div
	ts_div.id = 'ts_div'
	ts_div.style = 'background-color:#6b6f71'

	let ts_canvas = ts_div.appendChild(document.createElement('canvas'))
	global.ui.ts_canvas = ts_canvas
	ts_canvas.style='position:relative; left:0px; top:0px; z-index:1;'
	ts_canvas.id = 'ts_canvas'
	ts_canvas.tabindex = '1'
	install_event_listener(ts_canvas, "mousemove", ts_canvas, EVENT.MOUSEMOVE)

	let main_div = document.createElement('div')
	global.ui.main_div = main_div
	main_div.id = 'main_div'
	main_div.style = 'position:absolute; width:100%; height:100%; display:grid; grid-template-columns:250px auto; grid-template-rows:100%; grid-column-gap:10px;'
	main_div.appendChild(left_panel)
	main_div.appendChild(ts_div)

	var body = document.getElementsByTagName('body')[0]
	global.ui.body = body
	body.style = 'margin:0px; background-color:#2f3233'
	body.appendChild(main_div)

	install_event_listener(window, "keydown", window, EVENT.KEYDOWN)

	// window.onkeydown = function(e) {
	// 	global.
	// }

}

function run_extremal_depth_algorithm()
{
	// get curves on the chart and creates the envelope for them
	let n = global.chart_symbols.length

	let symbols_ed = []

	let mem_checpoint_raw_p = global.tsvis_wasm_module.exports.tsvis_mem_get_checkpoint()

	let curve_list_raw_p = global.tsvis_wasm_module.exports.tsvis_CurveList_new(n)

	for (let i=0;i<n;i++) {
		let symbol = global.chart_symbols[i]
		let ts_current_values = symbol.ts_current_values
		if (ts_current_values == null) {
			console.log("Discarding symbol ", symbol.name, " on extremal depth computation")
		}
		symbols_ed.push(symbol)

		let m = ts_current_values.length
		let curve_raw_p  = global.tsvis_wasm_module.exports.tsvis_Curve_new(m)
		console.log("curve_raw_p",curve_raw_p)
		let values_raw_p = global.tsvis_wasm_module.exports.tsvis_Curve_values(curve_raw_p)
		console.log("values_raw_p",values_raw_p)
		const c_curve_values = new Float64Array(global.tsvis_wasm_module.exports.memory.buffer, values_raw_p, m);

		let ok = global.tsvis_wasm_module.exports.tsvis_CurveList_append(curve_list_raw_p, curve_raw_p)
	}

	let ed_raw_p = global.tsvis_wasm_module.exports.ed_extremal_depth_run(curve_list_raw_p)

	console.log(ed_raw_p)

	global.tsvis_wasm_module.exports.tsvis_mem_set_checkpoint(mem_checpoint_raw_p)

	console.log(global.tsvis_wasm_module.exports.tsvis_mem_get_checkpoint())

}

const KEY_S = 83
const KEY_E = 69
const KEY_N = 78

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
					symbol.on_table = true
				} else if (!found && symbol.on_table) {
					global.ui.symbols_table.removeChild(symbol.ui_row)
					symbol.on_table = false
				}
			}
			console.log(pattern)
		} else if (e.event_type == EVENT.TOGGLE_SYMBOL) {
			let symbol = e.context
			let color  = pick_color()
			if (!symbol.on_chart) {
				// add symbol to chart
				symbol.on_chart = true
				global.chart_symbols.push(symbol)
				global.chart_colors.push(color)
				symbol.ui_col.style.color = color
				symbol.ui_col.style.fontWeight = 'bold'
				download_symbol_data(symbol)
			} else {
				let to_remove = global.chart_symbols.indexOf(symbol)
				if (to_remove > -1) {
				  global.chart_symbols.splice(to_remove, 1);
				  global.chart_colors.splice(to_remove, 1);
				}
				symbol.on_chart = false
				symbol.ui_col.style.color = "#6b6f71"
				symbol.ui_col.style.fontWeight = 'initial'
			}
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
		} else if (e.event_type == EVENT.KEYDOWN) {
			if (e.raw.keyCode == KEY_N) {
				global.key_update_norm = true
			} else if (e.raw.keyCode == KEY_S) {
				global.key_update_start = true
			} else if (e.raw.keyCode == KEY_E) {
				global.key_update_end = true
			}
		} else if (e.event_type == EVENT.RUN_EXTREMAL_DEPTH_ALGORITHM) {
			console.log(global.tsvis_wasm_module.exports.tsvis_mem_get_checkpoint())
			run_extremal_depth_algorithm()
		}
	}
	global.events.length = 0
}

// draw the time series charts
function update_ts()
{
	let canvas = global.ui.ts_canvas
	let ctx = canvas.getContext('2d')
	canvas.width  = global.ui.ts_div.clientWidth;
	canvas.height = global.ui.ts_div.clientHeight;

	let local_mouse_pos = get_local_mouse_pos(canvas)

	let rect = [0, 0, canvas.width, canvas.height]

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

	let margin = [ 100, 50, 5, 5 ]
	let ts_rect = [ rect[0] + margin[SIDE.LEFT],
		        rect[1] + margin[SIDE.TOP],
		        rect[2] - margin[SIDE.LEFT] - margin[SIDE.RIGHT],
		        rect[3] - margin[SIDE.BOTTOM] - margin[SIDE.TOP] ]

	ctx.clearRect(0,0,canvas.width, canvas.height)

	ctx.fillStyle="#2f3233"
	ctx.moveTo(0,0)
	ctx.rect(ts_rect[RECT.LEFT],ts_rect[RECT.TOP],ts_rect[RECT.WIDTH],ts_rect[RECT.HEIGHT])
	ctx.fill()

	let date_start = date_offset(global.date_start)
	let date_end   = date_offset(global.date_end)
	let date_norm  = date_offset(global.date_norm)

	ctx.font = "bold 14pt Courier"
	ctx.fillStyle = "#FFFFFF";
	ctx.textAlign = "center";

	//drawing axis labels
	//ctx.fillText("LABEL-X", canvas.width/2, canvas.height-50)

	//drawing axis strokes
	ctx.save()
	ctx.strokeStyle = "#FFFFFF";
	ctx.lineWidth   = 2;

	ctx.beginPath()
	//y axis
	ctx.moveTo(margin[SIDE.LEFT], margin[SIDE.TOP])
	ctx.lineTo(margin[SIDE.LEFT], canvas.height-margin[SIDE.BOTTOM]+6)
	//x axis
	ctx.moveTo(margin[SIDE.LEFT]-6, canvas.height-margin[SIDE.BOTTOM])
	ctx.lineTo(canvas.width-margin[SIDE.RIGHT], canvas.height-margin[SIDE.BOTTOM])
	ctx.stroke()

	ctx.restore()


	//--------------
	// find y range
	//--------------
	let y_min = 1.0
	let y_max = 1.0
	let last_valid_value = 1
	for (let i=0;i<global.chart_symbols.length;i++) {
		let symbol = global.chart_symbols[i]
		symbol.ts_current_values = null
		if (symbol.data == null) {
			continue
		}
		let norm_value = undefined
		let k = date_end - date_start
		let offset = date_norm - date_start
		for (let j=0;j<k;j++) {
			// 0 1 2 3 4 5 * 7 8
			norm_value = symbol.data[date_start + ((offset + j) % k)]
			if (norm_value != undefined) {
				break;
			}
		}
		if (norm_value == undefined) {
			console.log("no price for symbol " + symbol.name + " on norm date")
			ts_current_values = null
		}
		let ts_current_values = []
		for (let j=date_start;j<=date_end;j++) {
			let value = symbol.data[j]
			if (value == undefined) {
				value = last_valid_value
			} else {
				value = value / norm_value
			}
			ts_current_values.push(value)
			last_valid_value = value
			y_min = Math.min(y_min, value)
			y_max = Math.max(y_max, value)
		}
		symbol.ts_current_values = ts_current_values
	}
	if(y_min == y_max) {
		y_min = y_max-1
	}

	//--------------
	// x range
	//--------------
	let x_min = 0
	let x_max = date_end - date_start

	function map(x, y) {
		let px = ts_rect[RECT.LEFT] + (1.0 * (x - x_min) / (x_max - x_min)) * ts_rect[RECT.WIDTH]
		let py = ts_rect[RECT.TOP] + (ts_rect[RECT.HEIGHT] - 1 - (1.0 * (y - y_min) / (y_max - y_min)) * ts_rect[RECT.HEIGHT])
		return [px,py]
	}

	function inverse_map(px, py) {
		let x = (px - ts_rect[RECT.LEFT]) / ts_rect[RECT.WIDTH] * (1.0*(x_max - x_min)) + x_min
		let y = -((((py - ts_rect[RECT.TOP] - ts_rect[RECT.HEIGHT] + 1) * (1.0 * (y_max - y_min))) / ts_rect[RECT.HEIGHT]) - y_min)
		return [x,y]
	}

	//grid lines
	let x_num_ticks = 8
	let x_ticks = []
	for(let i=0; i<x_num_ticks; i++) {
		let x_tick = Math.floor(x_min+(i*((x_max-x_min)/(x_num_ticks-1))))
		x_ticks.push(x_tick)
	}

	for(let i=0; i<date_end-date_start; i+=2) {
		ctx.fillStyle= "#ffff0011";

		let p0 = map(i, y_min)
		let p1 = map(i, y_max)

		let next_p0 = map(i+1, y_min)
		let dx = next_p0[0] - p0[0]

		ctx.beginPath()
		ctx.rect(p0[0]-dx/2.0, p1[1], dx, ts_rect[RECT.HEIGHT])
		ctx.fill()
	}


	for(let i=0; i<x_ticks.length; i++) {
		ctx.strokeStyle = "#555555";
		ctx.lineWidth   = 1;

		let p0 = map(x_ticks[i], y_min)
		let p1 = map(x_ticks[i], y_max)

		ctx.beginPath()
		ctx.moveTo(p0[0], p0[1])
		ctx.lineTo(p1[0], p1[1])
		ctx.stroke()


		ctx.save();
		ctx.font = "bold 12pt Courier"
		ctx.fillStyle = "#FFFFFF"
		ctx.translate(p0[0], p0[1]+42);
		ctx.rotate(-Math.PI/4);
		ctx.fillText(date_offset_to_string(date_start + (x_ticks[i])), 0, 0);
		ctx.restore();
	}


	//y
	let y_num_ticks = 10
	let y_ticks = []
	for(let i=0; i<y_num_ticks; i++) {
		let y_tick = y_min+((1.0*i*(y_max-y_min))/(y_num_ticks-1))
		y_ticks.push(y_tick)
	}

	for(let i=0; i<y_ticks.length; i++) {
		ctx.strokeStyle = "#555555";
		ctx.lineWidth   = 1;

		let p0 = map(x_min, y_ticks[i])
		let p1 = map(x_max, y_ticks[i])

		ctx.beginPath()
		ctx.moveTo(p0[0], p0[1])
		ctx.lineTo(p1[0], p1[1])
		ctx.stroke()

		ctx.font = "bold 12pt Courier"
		ctx.fillStyle = "#FFFFFF"
		if(i==(y_ticks.length-1)) {
			ctx.fillText(y_ticks[i].toFixed(2), p0[0]-23, p0[1]+8);
		} else {
			ctx.fillText(y_ticks[i].toFixed(2), p0[0]-23, p0[1]+5);
		}

	}

	//VERTICAL LINE ON NORM_DATE
	let x_norm = date_norm - date_start

	ctx.strokeStyle = "#FFFFFFFF";
	ctx.lineWidth   = 1;

	let p0 = map(x_norm, y_min)
	let p1 = map(x_norm, y_max)

	ctx.beginPath()
	ctx.moveTo(p0[0], p0[1])
	ctx.lineTo(p1[0], p1[1])
	ctx.stroke()

	ctx.save();
	ctx.font = "bold 12pt Courier"
	ctx.fillStyle = "#FFFFFFFF"
	ctx.translate(p1[0]+10, p1[1]+50);
	ctx.rotate(Math.PI/2);
	ctx.fillText(date_offset_to_string(date_start+x_norm), 0, 0);
	ctx.restore();

	//LINES ON MOUSE POSITION
	let pt = inverse_map(local_mouse_pos[0],local_mouse_pos[1])

	let y_p0 = map(Math.floor(0.5+pt[0]),y_min)
	let y_p1 = map(Math.floor(0.5+pt[0]),y_max)

	ctx.beginPath()
	ctx.moveTo(y_p0[0], y_p0[1])
	ctx.lineTo(y_p1[0], y_p1[1])
	ctx.stroke()
	drawTextBG(ctx, date_offset_to_string(date_start+pt[0]), y_p0[0], y_p0[1])

	let x_p0 = map(x_min, pt[1])
	let x_p1 = map(x_max, pt[1])

	ctx.beginPath()
	ctx.moveTo(x_p0[0], x_p0[1])
	ctx.lineTo(x_p1[0], x_p1[1])
	ctx.stroke()
	drawTextBG(ctx, pt[1].toFixed(2), x_p0[0], x_p0[1])


	//HIGHLIGHTING UTILS
	let closest_date = null
	let closest_symbol  = null
	let min_distance_threshold = 5 * 5
	let closest_distance = 100000

	function update_closest_point(symbol, date, px, py) {
		let dx = local_mouse_pos[0] - px
		let dy = local_mouse_pos[1] - py
		let dist = dx * dx + dy * dy
		if (dist <= min_distance_threshold && dist < closest_distance) {
			closest_symbol = symbol
			closest_date = date
		}
	}

	function draw_timeseries(symbol, focused) {

		let ts_current_values = symbol.ts_current_values
		if (ts_current_values == null) {
			console.log("Not drawing ts for symbol ", symbol.name);
			return;
		}


		if (focused) {
			ctx.lineWidth = 4
		} else {
			ctx.lineWidth = 2
		}

		let i = global.chart_symbols.indexOf(symbol)
		if (symbol.data == null) {
			return
		}

		// let norm_value = actual_norm_values[i] // symbol.data[date_norm]
		// if (norm_value == undefined) {
		// 	console.log("no price for symbol " + symbol.name + " on norm date")
		// 	return
		// }

		let first_point_drawn = false
		ctx.strokeStyle = global.chart_colors[i]
		ctx.beginPath()
		for (let j=x_min;j<=x_max;j++) {
			let date_offset = date_start+j
			let yi = ts_current_values[j]
			let p = map(j,yi)
			update_closest_point(symbol, j, p[0], p[1])
			if (!first_point_drawn) {
				ctx.moveTo(p[0],p[1])
				first_point_drawn = true
			} else {
				ctx.lineTo(p[0],p[1])
			}
		}
		ctx.stroke()
	}

	function draw_point(i, j, r) {
		let values = global.focused_symbol.data
		let yi = values[j]
		let p = map(j,yi)
		update_closest_point(i, j, p[0], p[1])
		ctx.beginPath()
		ctx.arc(p[0],p[1],r,0,Math.PI*2,true)
		ctx.stroke()
	}

	//DRAWING TIME SERIES
	for (let i=0;i<global.chart_symbols.length;i++) {

		let symbol = global.chart_symbols[i]

		if(global.focused_symbol == null || global.chart_symbols[i] != global.focused_symbol) {
			draw_timeseries(symbol, false)
		}
	}

	if (global.focused_symbol != null) {
		draw_timeseries(global.focused_symbol, true)

		// ctx.strokeStyle = '#880000ff'
		// draw_point(global.focused_symbol, global.focused_date, 3)

		// print the details of the focused timeseries
		let record = global.focused_symbol
		let value = global.focused_symbol.data[global.focused_date]
		let date = date_offset_to_string(date_start+global.focused_date)
		let text = `symbol: ${global.focused_symbol.name} // date: ${date}`
		ctx.font = '24px Monospace';
		ctx.textAlign = 'center';
		ctx.fillText(text, canvas.width/2, 40);
	}

	// update focused record
	global.focused_symbol = closest_symbol
	global.focused_date = closest_date

	if (global.key_update_norm) {
		let pt_n = inverse_map(local_mouse_pos[0],local_mouse_pos[1])
		let new_date_norm = date_offset_to_string(Math.floor(date_start+pt_n[0]))

		document.getElementById('norm_date_input').value = new_date_norm
		global.date_norm = new_date_norm
		global.key_update_norm = false
	}
	// {
	// 	let pt_n = inverse_map(local_mouse_pos[0],local_mouse_pos[1])
	// 	let new_date_norm = date_offset_to_string(Math.floor(0.5 + date_start + pt_n[0]))
	// 	global.date_norm = new_date_norm
	// }

	if (global.key_update_start) {
		let pt_s = inverse_map(local_mouse_pos[0],local_mouse_pos[1])
		let new_date_start = date_offset_to_string(Math.floor(date_start+pt_s[0]))

		document.getElementById('start_date_input').value = new_date_start
		global.date_start = new_date_start
		global.key_update_start = false
	}
	if (global.key_update_end) {
		let pt_e = inverse_map(local_mouse_pos[0],local_mouse_pos[1])
		let new_date_end = date_offset_to_string(Math.floor(date_start+pt_e[0]))

		document.getElementById('end_date_input').value = new_date_end
		global.date_end = new_date_end
		global.key_update_end = false
	}

}

function update()
{
	process_event_queue()

	update_ts(); // draw ts

	// schedule update to process events
	setTimeout(update, 32)
}




// async function init() {
//
//     	const { instance } = await WebAssembly.instantiateStreaming( fetch("./add.wasm") );
//
// 	// initialize webassembly module
// 	instance.exports.rans_init();
//
// 	const js_array = [1, 2, 3, 4, 5];
//
// 	const c_checkpoint = instance.exports.rans_mem_get_checkpoint();
//
// 	const c_array_pointer = instance.exports.rans_malloc(js_array.length * 4);
//
// 	console.log(instance.exports.rans_mem_get_checkpoint());
//
// 	// Turn that sequence of 32-bit integers
// 	// into a Uint32Array, starting at that address.
// 	const c_array = new Uint32Array( instance.exports.memory.buffer, c_array_pointer, js_array.length );
//
// 	// Copy the values from JS to C.
// 	c_array.set(js_array);
//
// 	console.log(c_array_pointer)
//
// 	// Run the function, passing the starting address and length.
// 	console.log(instance.exports.rans_sum(c_array_pointer, c_array.length));
//
// 	instance.exports.rans_mem_set_checkpoint(c_checkpoint);
//
// 	console.log(instance.exports.rans_mem_get_checkpoint());
//
// 	console.log(instance.exports.rans_log(2));
// }
//
// init();





async function main()
{
	let result
	try {
    		// const { tsvis_wasm_module } = await WebAssembly.instantiateStreaming( fetch("./tsvis.wasm") );
		const { instance } = await WebAssembly.instantiateStreaming( fetch("tsvis.wasm") );
		global.tsvis_wasm_module = instance
		global.tsvis_wasm_module.exports.tsvis_init()

		/*
		let c_curve_raw_pointer = global.tsvis_wasm_module.exports.tsvis_new_curve(4)
		console.log("pointer: " + c_curve_raw_pointer)
		console.log("chkpt:   " + global.tsvis_wasm_module.exports.tsvis_mem_get_checkpoint())
		console.log("values:  " + global.tsvis_wasm_module.exports.tsvis_curve_values_array())

		let c_curve_values_raw = global.tsvis_wasm_module.exports.tsvis_curve_values_array()
		const c_curve_values = new Float64Array( instance.exports.memory.buffer, c_curve_values_raw, 4);
		c_curve_values.set([1.0, 3.2, 4.5, 8.7])
		*/

		let result = await fetch('http://localhost:8888/desc')
		let symbol_names = await result.json()
		let symbols = []
		for (let i=0;i<symbol_names.length;i++) {
			symbols.push({ name:symbol_names[i], ui_row:null, ui_col:null, on_table:true, on_chart:false, data: null, ts_current_values: null })
		}
		global.symbols = symbols
		//
		// change this with prepare_ui
		// you can now fill in the symbols
		//
		console.log(global.symbols)
		prepare_ui();

		// schedule update to process events
		setTimeout(update, 32)

	} catch (e) {
		console.log("Fatal Error: couldn't download data")
		return
	}
}
