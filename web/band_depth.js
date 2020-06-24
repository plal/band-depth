/*
*/


const MSEC_PER_FRAME = 33

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

global = { ui: {} }
data   = {}

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
}

function update_main_canvas()
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

	// find ranges of the time series
	let x_min_value = 0
	let x_max_value = data.input.columns-1
	let y_min_value = data.input.column_values[0][0]
	let y_max_value = y_min_value
	for (let i=0;i<data.input.rows;i++) {
		for (let j=0;j<data.input.columns;j++) {
			let v = parseFloat(data.input.column_values[j][i])
			y_min_value = Math.min(v, y_min_value)
			y_max_value = Math.max(v, y_max_value)
		}
	}

	let margin = 10
	let tseries_rect = [ rect[0] + margin, rect[1] + margin, rect[2] - 2*margin, rect[3] - 2*margin]

	function map(x, y) {
		let px = tseries_rect[0] + (1.0 * (x - x_min_value) / (x_max_value - x_min_value)) * tseries_rect[2]
		let py = tseries_rect[1] + (1.0 * (y - y_min_value) / (y_max_value - y_min_value)) * tseries_rect[3]
		py = tseries_rect[3] - 1 - py
		return [px,py]
	}

	for (let i=0;i<data.input.rows;i++) {
		ctx.beginPath()
		let y0 = parseFloat(data.input.column_values[0][i])
		let p = map(0,y0)
		ctx.moveTo(p[0],p[1])
		for (let j=1;j<data.input.columns;j++) {
			let yi = parseFloat(data.input.column_values[j][i])
			p = map(j,yi)
			ctx.lineTo(p[0],p[1])
		}
		ctx.stroke()
	}
}


function update()
{
	update_main_canvas()

	setTimeout(update, MSEC_PER_FRAME)
}

function main()
{
	// read the two tables
	data.input= u_parse_tables(data_input, '|', '\n', String.fromCharCode(1))[0]
	data.output = u_parse_tables(data_output, '|', '\n', String.fromCharCode(1))[0]


	prepare_ui()

	setTimeout(update, MSEC_PER_FRAME)
}
