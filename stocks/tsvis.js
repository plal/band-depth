"use strict";


const EVENT= {
	FILTER: "event_filter",
	TOGGLE_SYMBOL: "event_toggle_symbol"
}


var global = {
	ui:{},
	symbols: [],
	chart_symbols: [],
	events: []
}

function install_event_listener(component, raw_event_type, context, event_type)
{
	component.addEventListener(raw_event_type, function(e) {
		console.log(event_type)
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
	let x = REFERENCE_DATE + date_offset * MSEC_PER_DAY
	return ((x.getYear())+1900).toString().padStart(4,'0') + "-"
		(x.getMonth()+1).toString().padStart(2,'0') + "-"
		(x.getDate()).toString().padStart(2,'0')
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
	let filter_input = document.createElement('input')
	global.ui.filter_input = filter_input
	filter_input.setAttribute("type","text")
	filter_input.id = 'filter_input'
	filter_input.style = 'position:absolute; top:5px; left:10px; margin:5; width:200px; height:24px; border-radius:2px;\
						  background-color:#b0eafe; font-family:Helvetica; font-size:14pt'
	install_event_listener(filter_input, 'change', filter_input, EVENT.FILTER)


	let symbols_table_div = document.createElement('div')
	global.ui.symbols_table_div = symbols_table_div
	symbols_table_div.id = 'symbols_table_div'
	symbols_table_div.style = 'position:absolute; overflow:auto; top:44px; left:10px; margin:5; width:200px; height:500px; border-radius:2px;\
	 				  		   background-color:#b0eafe'
	let table = symbols_table_div.appendChild(document.createElement('table'))
	global.ui.symbols_table = table
	table.style = 'position:block; width:100%; heigth: 100% !important;'
	for (let i=0;i<global.symbols.length;i++) {
		let symbol = global.symbols[i]
		let row = table.appendChild(document.createElement('tr'))
		let col = row.appendChild(document.createElement('td'))
		col.innerText = symbol.name
		col.style = "cursor: pointer"
		symbol.ui_row = row
		symbol.ui_col = col
		install_event_listener(symbol.ui_col, 'click', symbol, EVENT.TOGGLE_SYMBOL)
	}

	// main_div
	let ts_div = document.createElement('div')
	global.ui.ts_div = ts_div
	ts_div.id = 'ts_div'
	ts_div.style = 'position:absolute; top:5px; left:220px; margin:5; width:1000; height:539px; background-color:#aaaaaa'

	let ts_canvas = ts_div.appendChild(document.createElement('canvas'))
	global.ui.ts_canvas = ts_canvas
	ts_canvas.style='position: absolute; left:0px; top:0px; z-index:1;'
	ts_canvas.id = 'ts_canvas'
	ts_canvas.tabindex = '1'



	var body = document.getElementsByTagName('body')[0]
	global.ui.body = body
	body.style = 'margin:5px; background-color:#6b6f71'
	body.appendChild(filter_input)
	body.appendChild(symbols_table_div)
	body.appendChild(ts_div)
}

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
			if (!symbol.on_chart) {
				// add symbol to chart
				symbol.on_chart = true
				global.chart_symbols.push(symbol)
				download_symbol_data(symbol)
			} else {
				let to_remove = global.chart_symbols.indexOf(symbol)
				if (to_remove > -1) {
				  global.chart_symbols.splice(to_remove, 1);
				}
				symbol.on_chart = false
			}
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
	// console.log('canvas w,h: ',canvas.width,canvas.height)

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

	// console.log('version updated: '+global.version)
	ctx.clearRect(0,0,canvas.width, canvas.height)

	ctx.fillStyle="#6b6f71"
	ctx.moveTo(0,0)
	ctx.rect(ts_rect[RECT.LEFT],ts_rect[RECT.TOP],ts_rect[RECT.WIDTH],ts_rect[RECT.HEIGHT])
	ctx.fill()

	// for s with data do
	//     find date range in the data <--

	// 1970-01-01


	// symbol.data = { 0: 123.4,
	let date_0 = date_offset("2020-01-01")        // 0 1 2 3 4 5 ...
	let date_1 = date_offset("2020-07-18")        //
	let date_norm = date_offset("2020-07-15")

	let y_min = 1.0
	let y_max = 1.0

	for (let i=0;i<global.chart_symbols.length;i++) {
		let symbol = global.chart_symbols[i]
		if (symbol.data == null) {
			continue
		}
		let norm_value = symbol.data[date_norm]
		if (norm_value == undefined) {
			console.log("no price for symbol " + symbol.name + " on norm date")
			continue
		}
		for (let j=date_0;j<=date_1;j++) {
			let value = symbol.data[j]
			if (value == undefined) { continue }
			value = value / norm_value
			y_min = Math.min(y_min, value)
			y_max = Math.max(y_max, value)
		}
	}

	let x_min = 0
	let x_max = date_1 - date_0
	function map(x, y) {
		let px = ts_rect[RECT.LEFT] + (1.0 * (x - x_min) / (x_max - x_min)) * ts_rect[RECT.WIDTH]
		let py = ts_rect[RECT.TOP] + (ts_rect[RECT.HEIGHT] - 1 - (1.0 * (y - y_min) / (y_max - y_min)) * ts_rect[RECT.HEIGHT])
		return [px,py]
	}

	for (let i=0;i<global.chart_symbols.length;i++) {
		let symbol = global.chart_symbols[i]
		if (symbol.data == null) {
			continue
		}
		let norm_value = symbol.data[date_norm]
		if (norm_value == undefined) {
			console.log("no price for symbol " + symbol.name + " on norm date")
			continue
		}

		let first_point_drawn = false
		ctx.strokeStyle="#FFFFFF"
		ctx.beginPath()
		for (let j=x_min;j<=x_max;j++) {
			let yi = symbol.data[date_0 + j]
			if (yi == undefined) {
				continue
			}
			yi = yi/norm_value
			let p = map(j,yi)
			if (!first_point_drawn) {
				ctx.moveTo(p[0],p[1])
				first_point_drawn = true
			} else {
				ctx.lineTo(p[0],p[1])
			}
		}
		ctx.stroke()
	}
}

function update()
{
	process_event_queue()

	update_ts(); // draw ts

	// schedule update to process events
	setTimeout(update, 32)
}

async function main()
{
	let result
	try {
		let result = await fetch('http://localhost:8888/desc')
		let symbol_names = await result.json()
		let symbols = []
		for (let i=0;i<symbol_names.length;i++) {
			symbols.push({ name:symbol_names[i], ui_row:null, ui_col:null, on_table:true, on_chart:false, data: null})
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
	// then(response => {
	// 	global.symbols = response.json()
	// 	setTimeout(start, 10)
	// })
	// prepare_data()
	// prepare_ui()
	// setTimeout(update, MSEC_PER_FRAME)
}
