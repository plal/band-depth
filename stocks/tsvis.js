"use strict";

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
	DRAWING_FILTER: "event_drawing_filter"
}

var global = {
	ui:{},
	symbols: [],
	chart_symbols: [],
	chart_colors: [],
	groups: [],
	group_count: 0,
	chart_groups: [],
	events: [],
	date_start: "2020-03-25",
	date_end: "2020-10-05",
	date_norm: "2020-07-15",
	mouse: { position:[0,0], last_position:[0,0] },
	color: { colors:['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628'], counter:0 },
	focused_symbol: null,
	focused_date: null,
	key_update_norm: false,
	key_update_start: false,
	key_update_end: false,
	extremal_depth: {fbplot: {active: false, inner_band: {lower:[], upper:[]}, outer_band: {lower:[], upper:[]}, outliers:[] }, ranked_symbols: [] },
	modified_band_depth: {fbplot: {active: false, inner_band: {lower:[], upper:[]}, outer_band: {lower:[], upper:[]}, outliers:[] }, ranked_symbols: [] },
	denselines: { active: false, hashcode: 0, entries:[] },
	viewbox: { x:0, y:0, width:1, height:1, rows:4, cols:4 },
	recompute_viewbox: true,
	zoom: 0,
	drag: { active: false, startpos: [0,0] },
	red_filters: [],
	blue_filters: [],
	drawing_blue_filter: { active: false, startpos: null, endpos: null },
	drawing_red_filter: { active: false, startpos: null , endpos: null }
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

async function download_symbol_data(symbol)
{
	let result
	try {
		let result = await fetch('http://localhost:8888/get?p='+symbol.name)
		let data   = await result.json()
		let dict = {}
		for (let i=0;i<data.data[0].values.length;i++) {
			let offset = date_offset(data.data[0].dates[i])
			let price = parseInt(data.data[0].values[i])
			dict[offset] = price
		}
		symbol.data = dict
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
	symbol.ui_col.style.color = color
	symbol.ui_col.style.fontWeight = 'bold'
}

function remove_symbol_from_chart(symbol) {
	let to_remove = global.chart_symbols.indexOf(symbol)
	if (to_remove > -1) {
	  global.chart_symbols.splice(to_remove, 1);
	  global.chart_colors.splice(to_remove, 1);
	}
	symbol.on_chart = false
	symbol.ui_col.style.color = "#6b6f71"
	symbol.ui_col.style.fontWeight = 'initial'
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
				symbol.on_chart = true
				global.chart_symbols.push(symbol)
				global.chart_colors.push(color)
				symbol.ui_col.style.color = color
				symbol.ui_col.style.fontWeight = 'bold'
				download_symbol_data(symbol)
			}
		}
	}
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


function create_group() {
	let symbols = global.symbols

	let group 	   = {}
	let group_name = window.prompt("Enter group name", "Group " + global.group_count)
	group.name 	   = group_name
	group.color    = pick_color()
	group.on_chart = false
	group.members  = []
	group.fbed 	   = { active:false, inner_band: { lower:[], upper:[] }, outer_band: { lower:[], upper:[] }, outliers:[], ranked_symbols: [] }
	group.fbmbd    = { active:false, inner_band: { lower:[], upper:[] }, outer_band: { lower:[], upper:[] }, outliers:[], ranked_symbols: [] }

	for (let i=0; i<symbols.length; i++) {
		let symbol = symbols[i]

		if(symbol.on_chart) {
			group.members.push(symbol)

			let to_remove = global.chart_symbols.indexOf(symbol)
			if (to_remove > -1) {
			  global.chart_symbols.splice(to_remove, 1);
			  global.chart_colors.splice(to_remove, 1);
			}
			symbol.on_chart = false
			symbol.ui_col.style.color = "#6b6f71"
			symbol.ui_col.style.fontWeight = 'initial'
		}

	}

	global.groups.push(group)

	global.group_count = global.group_count + 1

	if (global.group_count == 1) {
		create_groups_table_div()
		update_groups_table()
	} else if (global.group_count > 1) {
		update_groups_table()
	}

	// console.log(global.groups)
}

function add_group_to_chart(group) {
	group.on_chart = true
	global.chart_groups.push(group)
	group.ui_col.style.color = group.color
	group.ui_col.style.fontWeight = 'bold'

	//--------------
	// add every group member to chart
	//--------------
	let members = group.members
	for (let i=0; i<members.length; i++) {
		let member = members[i]

		if (!member.on_chart) {
			// add member to chart
			// member.on_chart = true
			// global.chart_symbols.push(member)
			// global.chart_colors.push(group.color)
			// member.ui_col.style.color = group.color
			// member.ui_col.style.fontWeight = 'bold'
			add_symbol_to_chart(member)
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
	group.ui_col.style.color = "#6b6f71"
	group.ui_col.style.fontWeight = 'initial'
}

function remove_group(group) {

	remove_group_from_chart(group)

	let to_remove = global.groups.indexOf(group)
	if (to_remove > -1) {
		global.groups.splice(to_remove, 1)
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

function clear_chart() {
	let symbols = global.symbols
	let groups  = global.groups
	//--------------
	// remove every symbol from chart
	//--------------
	for (let i=0; i<symbols.length; i++) {

		let symbol = symbols[i]

		if (symbol.on_chart) {
			remove_symbol_from_chart(symbol)
		}
	}

	//--------------
	// remove every group from chart
	//--------------
	for (let i=0; i<groups.length; i++) {

		let group = groups[i]

		if (group.on_chart) {
			remove_group_from_chart(group)
		}
	}

	global.chart_symbols = []
	global.chart_colors  = []
	global.chart_groups	 = []
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

function prepare_ui()
{

	let start_date_input = document.createElement('input')
	global.ui.start_date_input = start_date_input
	start_date_input.setAttribute("type","date")
	start_date_input.defaultValue = global.date_start
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
	end_date_input.defaultValue = global.date_end
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
	norm_date_input.defaultValue = global.date_norm
	norm_date_input.classList.add('date_input')
	norm_date_input.id = 'norm_date_input'
	install_event_listener(norm_date_input, 'change', norm_date_input, EVENT.UPDATE)

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

	let normalize_btn = document.createElement('input')
	global.ui.normalize_btn = normalize_btn
	normalize_btn.type = "checkbox"
	//normalize_btn.classList.add('checkbox_input')

	let normalize_lbl = document.createElement('label')
	global.ui.normalize_lbl = normalize_lbl
	normalize_lbl.setAttribute("for", normalize_btn)
	normalize_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:230px'
	//normalize_lbl.classList.add('checkbox_input_label')
	normalize_lbl.innerHTML = 'Normalize values'

	let normalize_grid = document.createElement('div')
	global.ui.normalize_grid = normalize_grid
	normalize_grid.id = normalize_grid
	normalize_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around'
	normalize_grid.appendChild(normalize_lbl)
	normalize_grid.appendChild(normalize_btn)

	let modified_band_depth_btn = document.createElement('input')
	global.ui.modified_band_depth_btn = modified_band_depth_btn
	modified_band_depth_btn.type = "checkbox"
	//modified_band_depth_btn.classList.add('checkbox_input')
	install_event_listener(modified_band_depth_btn, 'click', modified_band_depth_btn, EVENT.RUN_MODIFIED_BAND_DEPTH_ALGORITHM)

	let modified_band_depth_lbl = document.createElement('label')
	global.ui.modified_band_depth_lbl = modified_band_depth_lbl
	modified_band_depth_lbl.setAttribute("for", modified_band_depth_btn)
	modified_band_depth_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:230px'
	//modified_band_depth_lbl.classList.add('checkbox_input_label')
	modified_band_depth_lbl.innerHTML = 'Functional Boxplot MBD'

	let modified_band_depth_grid = document.createElement('div')
	global.ui.modified_band_depth_grid = modified_band_depth_grid
	modified_band_depth_grid.id = modified_band_depth_grid
	modified_band_depth_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around'
	modified_band_depth_grid.appendChild(modified_band_depth_lbl)
	modified_band_depth_grid.appendChild(modified_band_depth_btn)

	let mbd_draw_outliers_btn = document.createElement('input')
	global.ui.mbd_draw_outliers_btn = mbd_draw_outliers_btn
	//mbd_draw_outliers_btn.checkmbd = 'true'
	mbd_draw_outliers_btn.type = "checkbox"

	let mbd_draw_outliers_lbl = document.createElement('label')
	global.ui.mbd_draw_outliers_lbl = mbd_draw_outliers_lbl
	mbd_draw_outliers_lbl.setAttribute("for", mbd_draw_outliers_btn)
	mbd_draw_outliers_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:160px;'
	//extremal_depth_lbl.classList.add('checkbox_input_label')
	mbd_draw_outliers_lbl.innerHTML = '- Draw outliers'

	let mbd_draw_outliers_grid = document.createElement('div')
	global.ui.mbd_draw_outliers_grid = mbd_draw_outliers_grid
	mbd_draw_outliers_grid.id = mbd_draw_outliers_grid
	mbd_draw_outliers_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around;' //justify-content:flex-end'
	mbd_draw_outliers_grid.appendChild(mbd_draw_outliers_lbl)
	mbd_draw_outliers_grid.appendChild(mbd_draw_outliers_btn)

	let extremal_depth_btn = document.createElement('input')
	global.ui.extremal_depth_btn = extremal_depth_btn
	extremal_depth_btn.type = "checkbox"
	//extremal_depth_btn.classList.add('checkbox_input')
	install_event_listener(extremal_depth_btn, 'click', extremal_depth_btn, EVENT.RUN_EXTREMAL_DEPTH_ALGORITHM)

	let extremal_depth_lbl = document.createElement('label')
	global.ui.extremal_depth_lbl = extremal_depth_lbl
	extremal_depth_lbl.setAttribute("for", extremal_depth_btn)
	extremal_depth_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:230px'
	//extremal_depth_lbl.classList.add('checkbox_input_label')
	extremal_depth_lbl.innerHTML = 'Functional Boxplot ED'

	let extremal_depth_grid = document.createElement('div')
	global.ui.extremal_depth_grid = extremal_depth_grid
	extremal_depth_grid.id = extremal_depth_grid
	extremal_depth_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around'
	extremal_depth_grid.appendChild(extremal_depth_lbl)
	extremal_depth_grid.appendChild(extremal_depth_btn)

	let draw_curves_btn = document.createElement('input')
	global.ui.draw_curves_btn = draw_curves_btn
	draw_curves_btn.checked = 'true'
	draw_curves_btn.type = "checkbox"

	let draw_curves_lbl = document.createElement('label')
	global.ui.draw_curves_lbl = draw_curves_lbl
	draw_curves_lbl.setAttribute("for", draw_curves_btn)
	draw_curves_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:120px'
	//extremal_depth_lbl.classList.add('checkbox_input_label')
	draw_curves_lbl.innerHTML = 'Draw curves'

	let draw_curves_grid = document.createElement('div')
	global.ui.draw_curves_grid = draw_curves_grid
	draw_curves_grid.id = draw_curves_grid
	draw_curves_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around'
	draw_curves_grid.appendChild(draw_curves_lbl)
	draw_curves_grid.appendChild(draw_curves_btn)

	let ed_draw_outliers_btn = document.createElement('input')
	global.ui.ed_draw_outliers_btn = ed_draw_outliers_btn
	//ed_draw_outliers_btn.checked = 'true'
	ed_draw_outliers_btn.type = "checkbox"

	let ed_draw_outliers_lbl = document.createElement('label')
	global.ui.ed_draw_outliers_lbl = ed_draw_outliers_lbl
	ed_draw_outliers_lbl.setAttribute("for", ed_draw_outliers_btn)
	ed_draw_outliers_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:160px;'
	//extremal_depth_lbl.classList.add('checkbox_input_label')
	ed_draw_outliers_lbl.innerHTML = '- Draw outliers'

	let ed_draw_outliers_grid = document.createElement('div')
	global.ui.ed_draw_outliers_grid = ed_draw_outliers_grid
	ed_draw_outliers_grid.id = ed_draw_outliers_grid
	ed_draw_outliers_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around;' //justify-content:flex-end'
	ed_draw_outliers_grid.appendChild(ed_draw_outliers_lbl)
	ed_draw_outliers_grid.appendChild(ed_draw_outliers_btn)

	let draw_ed_dcdf_curves_btn = document.createElement('input')
	global.ui.draw_ed_dcdf_curves_btn = draw_ed_dcdf_curves_btn
	// draw_ed_dcdf_curves_btn.checked = 'false'
	draw_ed_dcdf_curves_btn.type = "checkbox"

	let draw_ed_dcdf_curves_lbl = document.createElement('label')
	global.ui.draw_ed_dcdf_curves_lbl = draw_ed_dcdf_curves_lbl
	draw_ed_dcdf_curves_lbl.setAttribute("for", draw_ed_dcdf_curves_btn)
	draw_ed_dcdf_curves_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:160px;'
	//extremal_depth_lbl.classList.add('checkbox_input_label')
	draw_ed_dcdf_curves_lbl.innerHTML = '- Draw d-cdfs'

	let draw_ed_dcdf_curves_grid = document.createElement('div')
	global.ui.draw_ed_dcdf_curves_grid = draw_ed_dcdf_curves_grid
	draw_ed_dcdf_curves_grid.id = draw_ed_dcdf_curves_grid
	draw_ed_dcdf_curves_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around;' //justify-content:flex-end'
	draw_ed_dcdf_curves_grid.appendChild(draw_ed_dcdf_curves_lbl)
	draw_ed_dcdf_curves_grid.appendChild(draw_ed_dcdf_curves_btn)

	let draw_ed_dcdf_agg = document.createElement('input')
	global.ui.draw_ed_dcdf_agg = draw_ed_dcdf_agg
	draw_ed_dcdf_agg.type = 'radio'
	draw_ed_dcdf_agg.checked = true
	draw_ed_dcdf_agg.name = 'dcdf-vis-choice'

	let draw_ed_dcdf_agg_lbl = document.createElement('label')
	global.ui.draw_ed_dcdf_lbl = draw_ed_dcdf_agg_lbl
	draw_ed_dcdf_agg_lbl.setAttribute("for", draw_ed_dcdf_curves_btn)
	draw_ed_dcdf_agg_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:160px;'
	//extremal_depth_lbl.classList.add('checkbox_input_label')
	draw_ed_dcdf_agg_lbl.innerHTML = '-- Aggregated'

	let draw_ed_dcdf_agg_grid = document.createElement('div')
	global.ui.draw_ed_dcdf_agg_grid = draw_ed_dcdf_agg_grid
	draw_ed_dcdf_agg_grid.id = draw_ed_dcdf_agg_grid
	draw_ed_dcdf_agg_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around;' //justify-content:flex-end'
	draw_ed_dcdf_agg_grid.appendChild(draw_ed_dcdf_agg_lbl)
	draw_ed_dcdf_agg_grid.appendChild(draw_ed_dcdf_agg)

	let draw_ed_dcdf_sep = document.createElement('input')
	global.ui.draw_ed_dcdf_sep = draw_ed_dcdf_sep
	draw_ed_dcdf_sep.type = 'radio'
	draw_ed_dcdf_sep.name = 'dcdf-vis-choice'

	let draw_ed_dcdf_sep_lbl = document.createElement('label')
	global.ui.draw_ed_dcdf_lbl = draw_ed_dcdf_sep_lbl
	draw_ed_dcdf_sep_lbl.setAttribute("for", draw_ed_dcdf_curves_btn)
	draw_ed_dcdf_sep_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:160px;'
	//extremal_depth_lbl.classList.add('checkbox_input_label')
	draw_ed_dcdf_sep_lbl.innerHTML = '-- Separated'

	let draw_ed_dcdf_sep_grid = document.createElement('div')
	global.ui.draw_ed_dcdf_sep_grid = draw_ed_dcdf_sep_grid
	draw_ed_dcdf_sep_grid.id = draw_ed_dcdf_sep_grid
	draw_ed_dcdf_sep_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around;' //justify-content:flex-end'
	draw_ed_dcdf_sep_grid.appendChild(draw_ed_dcdf_sep_lbl)
	draw_ed_dcdf_sep_grid.appendChild(draw_ed_dcdf_sep)


	let filter_input = document.createElement('input')
	global.ui.filter_input = filter_input
	filter_input.setAttribute("type","text")
	filter_input.id = 'filter_input'
	filter_input.style = 'position:relative; width:100%; margin:2px; border-radius:2px; background-color:#FFFFFF; font-family:Courier; font-size:14pt;'
	install_event_listener(filter_input, 'change', filter_input, EVENT.FILTER)

	let add_table_symbols_btn = document.createElement('button')
	global.ui.add_table_symbols_btn = add_table_symbols_btn
	//add_table_symbols_btn.setAttribute("type","button")
	add_table_symbols_btn.id = "add_table_symbols_btn"
	add_table_symbols_btn.textContent = 'add curves on table'
	add_table_symbols_btn.style = "position:relative; width:100%; margin:2px; border-radius:13px; background-color:#AAAAAA; font-family:Courier; font-size:12pt;"
	install_event_listener(add_table_symbols_btn, 'click', add_table_symbols_btn, EVENT.ADD_TABLE_SYMBOLS)

	let create_group_btn = document.createElement('button')
	global.ui.create_group_btn = create_group_btn
	//create_group_btn.setAttribute("type","button")
	create_group_btn.id = "create_group_btn"
	create_group_btn.textContent = 'create group'
	create_group_btn.style = "position:relative; width:100%; margin:2px; border-radius:13px; background-color:#AAAAAA; font-family:Courier; font-size:12pt;"
	install_event_listener(create_group_btn, 'click', create_group_btn, EVENT.CREATE_GROUP)

	let remove_active_groups_btn = document.createElement('button')
	global.ui.remove_active_groups_btn = remove_active_groups_btn
	//remove_active_groups_btn.setAttribute("type","button")
	remove_active_groups_btn.id = "remove_active_groups_btn"
	remove_active_groups_btn.textContent = 'remove active groups'
	remove_active_groups_btn.style = "position:relative; width:100%; margin:2px;\
	 								  border-radius:13px; background-color:#AAAAAA; font-family:Courier; font-size:12pt;"
	install_event_listener(remove_active_groups_btn, 'click', remove_active_groups_btn, EVENT.REMOVE_ACTIVE_GROUPS)

	let clear_chart_btn = document.createElement('button')
	global.ui.clear_chart_btn = clear_chart_btn
	//clear_chart_btn.setAttribute("type","button")
	clear_chart_btn.id = "clear_chart_btn"
	clear_chart_btn.textContent = 'clear chart'
	clear_chart_btn.style = "position:relative; width:100%; margin:2px; border-radius:13px; background-color:#AAAAAA; font-family:Courier; font-size:12pt;"
	install_event_listener(clear_chart_btn, 'click', clear_chart_btn, EVENT.CLEAR_CHART)

	let symbols_table_div = document.createElement('div')
	global.ui.symbols_table_div = symbols_table_div
	symbols_table_div.id = 'symbols_table_div'
	symbols_table_div.style = 'position:relative; width:100%; height:100%; margin:2px; overflow:auto; border-radius:2px; background-color:#FFFFFF'

	let create_curve_density_matrix_btn = document.createElement('input')
	global.ui.create_curve_density_matrix_btn = create_curve_density_matrix_btn
	//create_curve_density_matrix_btn.checked = 'true'
	create_curve_density_matrix_btn.type = "checkbox"
	install_event_listener(create_curve_density_matrix_btn, 'click', create_curve_density_matrix_btn, EVENT.BUILD_CURVES_DENSITY_MATRIX)

	let create_curve_density_matrix_lbl = document.createElement('label')
	global.ui.create_curve_density_matrix_lbl = create_curve_density_matrix_lbl
	create_curve_density_matrix_lbl.setAttribute("for", create_curve_density_matrix_btn)
	create_curve_density_matrix_lbl.style = 'font-family:Courier; font-size:13pt; color: #FFFFFF; width:120px'
	//extremal_depth_lbl.classList.add('checkbox_input_label')
	create_curve_density_matrix_lbl.innerHTML = 'DenseLines'

	let create_curve_density_matrix_resolution = document.createElement('input')
	global.ui.create_curve_density_matrix_resolution = create_curve_density_matrix_resolution
	create_curve_density_matrix_resolution.value = "32"
	create_curve_density_matrix_resolution.style = "position:relative; width:35; margin:2px"

	let create_curve_density_matrix_grid = document.createElement('div')
	global.ui.create_curve_density_matrix_grid = create_curve_density_matrix_grid
	create_curve_density_matrix_grid.id = create_curve_density_matrix_grid
	create_curve_density_matrix_grid.style = 'display:flex; flex-direction:row; background-color:#2f3233; align-content:space-around;' //justify-content:flex-end'
	create_curve_density_matrix_grid.appendChild(create_curve_density_matrix_lbl)
	create_curve_density_matrix_grid.appendChild(create_curve_density_matrix_btn)
	create_curve_density_matrix_grid.appendChild(create_curve_density_matrix_resolution)

	let left_panel = document.createElement('div')
   	global.ui.left_panel = left_panel
   	left_panel.id = 'left_panel'
   	left_panel.style = 'display:flex; flex-direction:column; background-color:#2f3233; align-content:space-around;'
	left_panel.appendChild(start_date_grid)
	left_panel.appendChild(end_date_grid)
	left_panel.appendChild(norm_date_grid)
	left_panel.appendChild(normalize_grid)
	left_panel.appendChild(modified_band_depth_grid)
	left_panel.appendChild(mbd_draw_outliers_grid)
	left_panel.appendChild(extremal_depth_grid)
	left_panel.appendChild(ed_draw_outliers_grid)
	left_panel.appendChild(draw_ed_dcdf_curves_grid)
	left_panel.appendChild(draw_ed_dcdf_agg_grid)
	left_panel.appendChild(draw_ed_dcdf_sep_grid)
	left_panel.appendChild(draw_curves_grid)
	left_panel.appendChild(create_curve_density_matrix_grid)
	left_panel.appendChild(filter_input)
	left_panel.appendChild(add_table_symbols_btn)
	left_panel.appendChild(clear_chart_btn)
   	left_panel.appendChild(symbols_table_div)
	left_panel.appendChild(create_group_btn)
	left_panel.appendChild(remove_active_groups_btn)

	let symbols_table = symbols_table_div.appendChild(document.createElement('table'))
	global.ui.symbols_table = symbols_table
	symbols_table.style = 'position:block; width:100%; heigth: 100% !important;'
	for (let i=0;i<global.symbols.length;i++) {
		let symbol = global.symbols[i]
		let row = symbols_table.appendChild(document.createElement('tr'))
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
	install_event_listener(ts_canvas, "wheel", ts_canvas, EVENT.MOUSEWHEEL)
	install_event_listener(ts_canvas, "mousedown", ts_canvas, EVENT.MOUSEDOWN)
	install_event_listener(ts_canvas, "mouseup", ts_canvas, EVENT.MOUSEUP)
	install_event_listener(ts_canvas, "dblclick", ts_canvas, EVENT.DBCLICK)
	install_event_listener(ts_canvas, "click", ts_canvas, EVENT.DRAWING_FILTER)

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
			console.log("Discarding symbol ", symbol.name, " on modified band depth computation")
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

function run_extremal_depth_algorithm()
{

	if (global.chart_symbols.length == 0) {
		window.alert("No symbols selected!")
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
		let ts_current_values = symbol.ts_current_values
		if (ts_current_values == null) {
			console.log("Discarding symbol ", symbol.name, " on extremal depth computation")
		}
		symbols_ed.push(symbol)

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

	let ed_raw_p = global.tsvis_wasm_module.exports.ed_extremal_depth_run(curve_list_raw_p)
	while (ed_raw_p == 0) {
		grow_heap()
		ed_raw_p = global.tsvis_wasm_module.exports.ed_extremal_depth_run(curve_list_raw_p)
	}

	let rank_raw_p 		 	 		= global.tsvis_wasm_module.exports.ed_get_extremal_depth_rank(ed_raw_p)
	let cdf_matrix_raw_p 	  		= global.tsvis_wasm_module.exports.ed_get_cdf_matrix(ed_raw_p)
	let n_of_pwdepth_unique_values  = global.tsvis_wasm_module.exports.ed_get_pointwise_depth_unique_values(ed_raw_p)
	let n_of_points 				= global.tsvis_wasm_module.exports.ed_get_number_of_points(ed_raw_p)

	// console.log(n_of_pwdepth_unique_values)
	// console.log(n_of_points)

	const rank = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, rank_raw_p, symbols_ed.length);
	const cdf_matrix = new Int32Array(global.tsvis_wasm_module.exports.memory.buffer, cdf_matrix_raw_p, n * n_of_pwdepth_unique_values)

	// console.log(cdf_matrix)

	global.extremal_depth.ranked_symbols = []
	for (let i=0;i<symbols_ed.length;i++) {
		let symbol_rank_i = symbols_ed[rank[i]]
		symbol_rank_i.ed_rank = i
		global.extremal_depth.ranked_symbols.push(symbol_rank_i)
	}

	for (let i=0;i<symbols_ed.length;i++) {
		let symbol_i = symbols_ed[i]
		let cdf_row = []
		for (let j=0; j<n_of_pwdepth_unique_values; j++) {
			let value = cdf_matrix[(n_of_pwdepth_unique_values*i)+j] / n_of_points
			if (j % 2 == 0) {
				cdf_row.push(value)
			}
		}
		symbol_i.cdf_matrix_row = cdf_row
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
			console.log("Discarding symbol ", symbol.name, " on extremal depth computation")
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
			console.log("Discarding symbol ", symbol.name, " on curve density matrix building")
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

const KEY_S      = 83
const KEY_E      = 69
const KEY_N      = 78
const KEY_PERIOD = 190
const KEY_COMMA  = 188
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
				add_symbol_to_chart(symbol, color)
				download_symbol_data(symbol)
			} else {
				remove_symbol_from_chart(symbol)
			}
		} else if (e.event_type == EVENT.ADD_TABLE_SYMBOLS) {
			add_table_symbols()
		} else if (e.event_type == EVENT.CREATE_GROUP) {
			create_group()
		} else if (e.event_type == EVENT.TOGGLE_GROUP) {
			let group = e.context
			if (!group.on_chart) {
				add_group_to_chart(group)
				if (e.raw.getModifierState("Shift")) {
					group.fbed.active = !group.fbed.active
					if(group.fbed.active) {
						console.log("ran ed algorithm with group " + group.name)
						run_depth_algorithm_group(group, "ed")
						// console.log(group)
					}
				}
				if (e.raw.getModifierState("Control")) {
					group.fbmbd.active = !group.fbmbd.active
					if(group.fbmbd.active) {
						run_depth_algorithm_group(group, "mbd")
						// console.log(group)
					}
				}
			} else {
				group.fbed.active  = false
				group.fbmbd.active = false
				remove_group_from_chart(group)
			}
		} else if (e.event_type == EVENT.REMOVE_ACTIVE_GROUPS) {
			remove_active_groups()
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
		} else if (e.event_type == EVENT.KEYDOWN) {
			if(e.raw.target.id != "filter_input") {
				if (e.raw.keyCode == KEY_N) {
					global.key_update_norm = true
				} else if (e.raw.keyCode == KEY_S) {
					global.key_update_start = true
				} else if (e.raw.keyCode == KEY_E) {
					global.key_update_end = true
				} else if (e.raw.keyCode == KEY_PERIOD) {
					global.ui.create_curve_density_matrix_resolution.value = 2 * parseInt(global.ui.create_curve_density_matrix_resolution.value)
				} else if (e.raw.keyCode == KEY_COMMA) {
					global.ui.create_curve_density_matrix_resolution.value = Math.max(1, parseInt(global.ui.create_curve_density_matrix_resolution.value) / 2)
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
			global.drag.active = true
			global.drag.startpos = [e.raw.x, e.raw.y]
			global.drag.startvbox = [global.viewbox.x, global.viewbox.y]
			// console.log("drag start position: " + e.raw.x + ", " + e.raw.y)
		} else if (e.event_type == EVENT.MOUSEUP) {
			global.drag.active = false
			// console.log("drag end position: " + e.raw.x + ", " + e.raw.y)
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
		} else if (e.event_type == EVENT.DRAWING_FILTER) {
			if (e.raw.getModifierState("Shift")) {
				global.drawing_blue_filter.active = !global.drawing_blue_filter.active
				if (global.drawing_blue_filter.active) {
					global.drawing_blue_filter.startpos = [e.raw.x, e.raw.y]
				} else {
					global.drawing_blue_filter.endpos = [e.raw.x, global.drawing_blue_filter.startpos[1]]
					let line = { startpos: global.drawing_blue_filter.startpos, endpos: global.drawing_blue_filter.endpos }
					global.blue_filters.push(line)
				}

			}
			if (e.raw.getModifierState("Control")) {
				global.drawing_red_filter.active = !global.drawing_red_filter.active
				if (global.drawing_red_filter.active) {
					global.drawing_red_filter.startpos = [e.raw.x, e.raw.y]
				} else {
					global.drawing_red_filter.endpos = [e.raw.x, global.drawing_red_filter.startpos[1]]
					let line = { startpos: global.drawing_red_filter.startpos, endpos: global.drawing_red_filter.endpos }
					global.red_filters.push(line)
				}

			}

		}
	}
	global.events.length = 0
}

//--------------
// draw the time series charts
//--------------
function update_ts()
{
	let canvas = global.ui.ts_canvas
	let ctx = canvas.getContext('2d')
	canvas.width  = global.ui.ts_div.clientWidth;
	canvas.height = global.ui.ts_div.clientHeight;

	let local_mouse_pos = get_local_position(global.mouse.position, canvas)

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

	let rect = [0, 0, canvas.width, canvas.height]
	let dcdf_rect_inf = null
	if (global.ui.draw_ed_dcdf_curves_btn.checked) {
		rect = [0, 0, canvas.width/2, canvas.height]
		dcdf_rect_inf = [canvas.width/2, 0, canvas.width/2, canvas.height]
	}

	let margin = [ 100, 55, 5, 5 ]

	let ts_rect = [ rect[0] + margin[SIDE.LEFT],
		        	rect[1] + margin[SIDE.TOP],
		        	rect[2] - margin[SIDE.LEFT] - margin[SIDE.RIGHT],
		        	rect[3] - margin[SIDE.BOTTOM] - margin[SIDE.TOP] ]

	let dcdf_rect = null
	let dcdf_rect_margins = [ 100, 33, 5, 5 ]
	if (global.ui.draw_ed_dcdf_curves_btn.checked) {
		dcdf_rect = [ dcdf_rect_inf[0] + dcdf_rect_margins[SIDE.LEFT],
					  dcdf_rect_inf[1] + dcdf_rect_margins[SIDE.TOP],
					  dcdf_rect_inf[2] - dcdf_rect_margins[SIDE.LEFT] - dcdf_rect_margins[SIDE.RIGHT],
					  dcdf_rect_inf[3] - dcdf_rect_margins[SIDE.BOTTOM] - dcdf_rect_margins[SIDE.TOP] ]
	}


	ctx.clearRect(0,0,canvas.width, canvas.height)

	let ts_closest_symbol  = null

	{
		ctx.save()

		ctx.fillStyle="#2f3233"

		ctx.moveTo(0,0)
		ctx.rect(ts_rect[RECT.LEFT],ts_rect[RECT.TOP],ts_rect[RECT.WIDTH],ts_rect[RECT.HEIGHT])
		ctx.fill()

		if (global.ui.draw_ed_dcdf_curves_btn.checked) {
			ctx.moveTo(dcdf_rect_inf[0], dcdf_rect_inf[1])
			ctx.rect(dcdf_rect[RECT.LEFT], dcdf_rect[RECT.TOP], dcdf_rect[RECT.WIDTH], dcdf_rect[RECT.HEIGHT])
			ctx.fill()
		}
		ctx.clip()



		ctx.restore()

		let date_start = date_offset(global.date_start)
		let date_end   = date_offset(global.date_end)
		let date_norm  = date_offset(global.date_norm)

		ctx.font = "bold 14pt Courier"
		ctx.fillStyle = "#FFFFFF";
		ctx.textAlign = "center";

		//--------------
		//drawing axis strokes
		//--------------
		ctx.strokeStyle = "#FFFFFF";
		ctx.lineWidth   = 2;

		ctx.beginPath()
		//y axis
		ctx.moveTo(ts_rect[RECT.LEFT], ts_rect[RECT.TOP])
		ctx.lineTo(ts_rect[RECT.LEFT], ts_rect[RECT.HEIGHT]+6)
		//x axis
		ctx.moveTo(ts_rect[RECT.LEFT], ts_rect[RECT.HEIGHT]+6)
		ctx.lineTo(ts_rect[RECT.LEFT] + ts_rect[RECT.WIDTH], ts_rect[RECT.HEIGHT]+6)
		ctx.stroke()

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
			if (global.ui.normalize_btn.checked) {
				if (norm_value == undefined) {
					console.log("no price for symbol " + symbol.name + " on norm date")
				}
			}
			let ts_current_values = []
			for (let j=date_start;j<=date_end;j++) {
				let value = symbol.data[j]
				if (value == undefined) {
					value = last_valid_value
				} else {
					if(global.ui.normalize_btn.checked) {
						value = value / norm_value
					}
				}
				// value = i
				ts_current_values.push(value)
				last_valid_value = value
				y_min = Math.min(y_min, value)
				y_max = Math.max(y_max, value)
			}
			symbol.ts_current_values = ts_current_values
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

		//--------------
		// x range
		//--------------
		let x_min = 0
		let x_max = date_end - date_start

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
		let rows = Math.floor(ts_rect[RECT.HEIGHT] / resolution)
		let cols = Math.floor(ts_rect[RECT.WIDTH] / resolution)
		global.viewbox.resolution = resolution
		global.viewbox.rows = rows
		global.viewbox.cols = cols

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

		let factor = 1.1
		let ref    = inverse_map(local_mouse_pos[0], local_mouse_pos[1])
		let y_ref  = ref[1]
		let x_ref  = ref[0]

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

		if (global.drag.active) {

			let local_dragstart_pos = get_local_position(global.drag.startpos, canvas)
			local_dragstart_pos = inverse_map(local_dragstart_pos[0], local_dragstart_pos[1])

			let local_currmouse_pos = inverse_map(local_mouse_pos[0], local_mouse_pos[1])

			global.viewbox.x = global.drag.startvbox[0] - Math.floor(local_currmouse_pos[0] - local_dragstart_pos[0])
			global.viewbox.y = global.drag.startvbox[1] - (local_currmouse_pos[1] - local_dragstart_pos[1])

			x_min = global.viewbox.x
			x_max = global.viewbox.x + global.viewbox.width

			y_min = global.viewbox.y
			y_max = global.viewbox.y + global.viewbox.height

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

		// console.log(x_ticks)

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
			ctx.font = "bold 10pt Courier"
			ctx.fillStyle = "#FFFFFF"
			ctx.translate(p0[0], p0[1]+42);
			ctx.rotate(-Math.PI/4);
			ctx.fillText(date_offset_to_string(date_start + (x_ticks[i])), 0, 0);
			ctx.restore();
		}


		//--------------
		//y grid lines and ticks
		//--------------
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

			ctx.font = "bold 10pt Courier"
			ctx.fillStyle = "#FFFFFF"
			if(i==(y_ticks.length-1)) {
				ctx.fillText(y_ticks[i].toFixed(2), p0[0]-20, p0[1]+8);
			} else {
				ctx.fillText(y_ticks[i].toFixed(2), p0[0]-20, p0[1]+5);
			}

		}

		ctx.save()

		ctx.moveTo(0,0)
		ctx.rect(ts_rect[RECT.LEFT],ts_rect[RECT.TOP],ts_rect[RECT.WIDTH],ts_rect[RECT.HEIGHT])
		ctx.clip()

		//--------------
		//vertical line to track norm date
		//--------------
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

		//--------------
		// drawing and highlighting utils
		//--------------
		let closest_date = null
		let min_distance_threshold = 5 * 5
		let closest_distance = 100000

		function update_closest_point(symbol, date, px, py) {
			let dx = local_mouse_pos[0] - px
			let dy = local_mouse_pos[1] - py
			let dist = dx * dx + dy * dy
			if (dist <= min_distance_threshold && dist < closest_distance) {
				ts_closest_symbol = symbol
				closest_date = date
			}
		}

		function update_closest_segment(symbol, date, p0x, p0y, p1x, p1y) {
			// a --> p0 to mouse
			// b --> p0 to p1
			// a.b = |a|*|b|*cos(Theta)
			// a.b/|b| = |a|*cos(theta)
			// |a|^2 - (|a|*cos(theta))^2 = h^2
			// |a|^2 - (a.b/|b|)^2 = h^2
			let ax = local_mouse_pos[0] - p0x
			let ay = local_mouse_pos[1] - p0y

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
				ts_closest_symbol = symbol
				closest_date = date
			}
		}

		function draw_timeseries(symbol, focused, color) {

			let ts_current_values = symbol.ts_current_values
			if (ts_current_values == null) {
				// console.log("Not drawing ts for symbol ", symbol.name);
				return;
			}

			let i = global.chart_symbols.indexOf(symbol)
			if (symbol.data == null) {
				return
			}

			let first_point_drawn   = false
			let curve_color 		= null
			let curve_focused_color = null
			let symbol_color 		= null

			if (global.ui.draw_ed_dcdf_curves_btn.checked) {

				curve_color 		= "#FFFFFF44"
				curve_focused_color = global.chart_colors[i]
				symbol_color 		= global.chart_colors[i]

			} else {

				if (typeof color !== 'undefined') {
					curve_color 		= color
					curve_focused_color = color
					symbol_color 		= color
				} else {
					curve_color 		= global.chart_colors[i]
					curve_focused_color = global.chart_colors[i]
					symbol_color 		= global.chart_colors[i]
				}

			}

			ctx.strokeStyle = curve_color
			symbol.ui_col.style.color = symbol_color

			if (focused) {
				ctx.lineWidth = 4
				ctx.strokeStyle = curve_focused_color
			} else {
				ctx.lineWidth = 2
			}

			ctx.beginPath()
			let p_prev = null
			for (let j=x_min;j<=x_max;j++) {
				let date_offset = date_start+j
				let yi = ts_current_values[j]
				let p = map(j,yi)
				if (p_prev) {
					update_closest_segment(symbol, j, p_prev[0], p_prev[1], p[0], p[1])
				}
				p_prev = p
				// update_closest_point(symbol, j, p[0], p[1])
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

		if (global.denselines.active) {

			let updated = build_curves_density_matrix()

			rows = global.viewbox.rows
			cols = global.viewbox.cols
			let max_value = Math.max.apply(null, global.denselines.entries)

			let cell_width  = ts_rect[RECT.WIDTH] / global.viewbox.cols
			let cell_height = ts_rect[RECT.HEIGHT] / global.viewbox.rows

			let starting_x = ts_rect[RECT.LEFT]
			let starting_y = ts_rect[RECT.TOP]

			let matrix = global.denselines.entries

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

			ctx.save()
			for (let i=0; i<rows; i++) {
				for (let j=0; j<cols; j++) {
					let value = matrix[(cols*i)+j]
					if(global.ui.normalize_btn.checked) {
						value = value / norm_value
					}
					// console.log(value)
					let color = "#2f3233"
					let color_scale = ['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58','#081d58']
					// ['#fff7ec','#fee8c8','#fdd49e','#fdbb84','#fc8d59','#ef6548','#d7301f','#b30000','#7f0000', '#7f0000']
					// ['#ffffcc','#ffeda0','#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#bd0026','#800026']
					// ['#67001f','#b2182b','#d6604d','#f4a582','#fddbc7','#f7f7f7','#d1e5f0','#92c5de','#4393c3','#2166ac','#053061']

					if (value > 0.0) {
						let x = value * (color_scale.length-1)
						let x_idx = Math.floor(x)
						let x_idx_next = Math.min(x_idx+1, color_scale.length-1)
						let lambda = 1 - (x - x_idx)
						color = hex_lerp(color_scale[x_idx], color_scale[x_idx_next], lambda)
					}

					ctx.fillStyle = color
					ctx.strokeStyle = ctx.fillStyle
					ctx.beginPath()
					ctx.rect( starting_x + (cell_width*j),
						  ts_rect[RECT.HEIGHT] - (i + 1) * cell_height, cell_width, cell_height)
					ctx.closePath()
					ctx.fill()
					ctx.stroke()
				}
			}
			ctx.restore()
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

				ctx.save()

				ctx.beginPath()
				let p = map(0,ymin[0])
				ctx.moveTo(p[0],p[1])
				for (let j=1;j<num_timesteps;j++) {
					p = map(j,ymin[j])
					ctx.lineTo(p[0],p[1])
				}
				for (let j=num_timesteps-1;j>=0;j--) {
					p = map(j,ymax[j])
					ctx.lineTo(p[0],p[1])
				}
				ctx.closePath()
				ctx.fillStyle="#00FFFF55"
				ctx.fill()

				ctx.restore()

				//--------------
				// drawing outer band
				//--------------
				let ymin_outer = global.extremal_depth.fbplot.outer_band.lower
				let ymax_outer = global.extremal_depth.fbplot.outer_band.upper

				ctx.save()
				ctx.strokeStyle = "#FFFFFF"
				ctx.setLineDash([5, 3])
				ctx.beginPath()
				p = map(0,ymin_outer[0])
				ctx.moveTo(p[0],p[1])
				for (let j=1;j<num_timesteps;j++) {
					p = map(j,ymin_outer[j])
					ctx.lineTo(p[0],p[1])
				}
				for (let j=num_timesteps-1;j>=0;j--) {
					p = map(j,ymax_outer[j])
					ctx.lineTo(p[0],p[1])
				}
				ctx.stroke()
				ctx.restore()

				//--------------
				// drawing median curve
				//--------------
				let median_symbol = global.extremal_depth.ranked_symbols[global.extremal_depth.ranked_symbols.length - 1]
				draw_timeseries(median_symbol, false, "#00FFFF")

				if (global.ui.ed_draw_outliers_btn.checked) {
					//--------------
					// drawing outliers
					//--------------
					for(let i=0; i<global.extremal_depth.fbplot.outliers.length; i++) {
						let symbol = global.extremal_depth.fbplot.outliers[i]
						draw_timeseries(symbol, false, "#00FFFF55")
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

				ctx.save()
				ctx.beginPath()
				let p = map(0,ymin[0])
				ctx.moveTo(p[0],p[1])
				for (let j=1;j<num_timesteps;j++) {
					p = map(j,ymin[j])
					ctx.lineTo(p[0],p[1])
				}
				for (let j=num_timesteps-1;j>=0;j--) {
					p = map(j,ymax[j])
					ctx.lineTo(p[0],p[1])
				}
				ctx.closePath()
				ctx.fillStyle="#FF000055"
				ctx.fill()
				ctx.restore()

				//--------------
				// drawing outer band
				//--------------
				let ymin_outer = global.modified_band_depth.fbplot.outer_band.lower
				let ymax_outer = global.modified_band_depth.fbplot.outer_band.upper

				ctx.save()
				ctx.strokeStyle = "#FFFFFF"
				ctx.setLineDash([5, 3])
				ctx.beginPath()
				p = map(0,ymin_outer[0])
				ctx.moveTo(p[0],p[1])
				for (let j=1;j<num_timesteps;j++) {
					p = map(j,ymin_outer[j])
					ctx.lineTo(p[0],p[1])
				}
				for (let j=num_timesteps-1;j>=0;j--) {
					p = map(j,ymax_outer[j])
					ctx.lineTo(p[0],p[1])
				}
				ctx.stroke()
				ctx.restore()

				//--------------
				// drawing median curve
				//--------------
				let median_symbol = global.modified_band_depth.ranked_symbols[global.modified_band_depth.ranked_symbols.length - 1]
				draw_timeseries(median_symbol, false, "#FF0000")

				if (global.ui.mbd_draw_outliers_btn.checked) {
					//--------------
					// drawing outliers
					//--------------
					for(let i=0; i<global.modified_band_depth.fbplot.outliers.length; i++) {
						let symbol = global.modified_band_depth.fbplot.outliers[i]
						draw_timeseries(symbol, false, "#FF000055")
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

				if(global.focused_symbol == null || global.chart_symbols[i] != global.focused_symbol) {
					draw_timeseries(symbol, false)
				}
			}

			for (let i=0; i<global.chart_groups.length; i++) {

				let group = global.chart_groups[i]
				let members = group.members

				for (let j=0; j<members.length; j++) {

					let member = members[j]

					if(global.focused_symbol == null || member != global.focused_symbol) {
						draw_timeseries(member, false, group.color)
					}

				}

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
				// console.log(depth_type)
				group_depth = group.fbmbd
			}

			let ymin = group_depth.inner_band.lower
			let ymax = group_depth.inner_band.upper
			let num_timesteps = group_depth.ranked_symbols[0].ts_current_values.length

			ctx.save()
			ctx.beginPath()
			let p = map(0,ymin[0])
			ctx.moveTo(p[0],p[1])
			for (let j=1;j<num_timesteps;j++) {
				p = map(j,ymin[j])
				ctx.lineTo(p[0],p[1])
			}
			for (let j=num_timesteps-1;j>=0;j--) {
				p = map(j,ymax[j])
				ctx.lineTo(p[0],p[1])
			}
			ctx.closePath()
			ctx.fillStyle = group.color + "55"
			ctx.fill()
			ctx.restore()

			//--------------
			// drawing outer band
			//--------------
			let ymin_outer = group_depth.outer_band.lower
			let ymax_outer = group_depth.outer_band.upper

			ctx.save()
			ctx.strokeStyle = group.color + "DD"
			ctx.setLineDash([5, 3])
			ctx.beginPath()
			p = map(0,ymin_outer[0])
			ctx.moveTo(p[0],p[1])
			for (let j=1;j<num_timesteps;j++) {
				p = map(j,ymin_outer[j])
				ctx.lineTo(p[0],p[1])
			}
			for (let j=num_timesteps-1;j>=0;j--) {
				p = map(j,ymax_outer[j])
				ctx.lineTo(p[0],p[1])
			}
			ctx.stroke()
			ctx.restore()

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
				draw_group_fbplot(group, "mbd")
			}
		}

		//--------------
		// highlight on focused time series
		//--------------
		if (global.focused_symbol != null) {
			draw_timeseries(global.focused_symbol, true)

			let record = global.focused_symbol
			let value = global.focused_symbol.data[global.focused_date]
			let date = date_offset_to_string(date_start+global.focused_date)
			let text = `symbol: ${global.focused_symbol.name} // date: ${date} // ED rank: #${global.focused_symbol.ed_rank+1} // `+
						`MBD rank: #${global.focused_symbol.mbd_rank+1}`

			if (global.ui.draw_ed_dcdf_curves_btn.checked) {
				ctx.font = '14px Monospace';
			} else {
				ctx.font = '20px Monospace';
			}
			ctx.textAlign = 'center';
			ctx.fillText(text, ts_rect[2]/2, 40);
		}


		let clamp = function(a,b,c) {
			return Math.max(b,Math.min(c,a))
		}
		//--------------
		//auxiliar lines on mouse position to track date and value
		//--------------
		let pt = inverse_map(local_mouse_pos[0],local_mouse_pos[1])
		pt[0] = clamp(pt[0],x_min,x_max)
		pt[1] = clamp(pt[1],y_min,y_max)

		let y_p0 = map(Math.floor(0.5+pt[0]),y_min)
		let y_p1 = map(Math.floor(0.5+pt[0]),y_max)

		ctx.strokeStyle = "#555555"
		ctx.beginPath()
		ctx.moveTo(y_p0[0], y_p0[1])
		ctx.lineTo(y_p1[0], y_p1[1])
		ctx.stroke()

		let x_p0 = map(x_min, pt[1])
		let x_p1 = map(x_max, pt[1])

		ctx.beginPath()
		ctx.moveTo(x_p0[0], x_p0[1])
		ctx.lineTo(x_p1[0], x_p1[1])
		ctx.stroke()

		ctx.restore() // TS_RECT CLIP END

		drawTextBG(ctx, date_offset_to_string(date_start+pt[0]), y_p0[0], y_p0[1])
		drawTextBG(ctx, pt[1].toFixed(2), x_p0[0], x_p0[1])


		//--------------
		// update focused record
		//--------------
		global.focused_date = closest_date

		//--------------
		// update start, end and norm dates on keyboard controls
		//--------------
		if (global.key_update_norm) {
			let pt_n = inverse_map(local_mouse_pos[0],local_mouse_pos[1])
			let new_date_norm = date_offset_to_string(Math.floor(date_start+pt_n[0]))

			document.getElementById('norm_date_input').value = new_date_norm
			global.date_norm = new_date_norm
			global.key_update_norm = false
		}

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
	} // time series drawings

	let ed_cdf_closest_symbol = null

	if(global.ui.draw_ed_dcdf_curves_btn.checked) {

		ctx.font = "bold 14pt Courier"
		ctx.fillStyle = "#FFFFFF";
		ctx.textAlign = "center";

		//--------------
		//drawing axis strokes
		//--------------
		ctx.save()
		ctx.strokeStyle = "#FFFFFF";
		ctx.lineWidth   = 2;

		ctx.beginPath()
		//y axis
		ctx.moveTo(dcdf_rect[RECT.LEFT], dcdf_rect[RECT.TOP])
		ctx.lineTo(dcdf_rect[RECT.LEFT], dcdf_rect[RECT.HEIGHT]+6)
		//x axis
		ctx.moveTo(dcdf_rect[RECT.LEFT], dcdf_rect[RECT.HEIGHT]+6)
		ctx.lineTo(dcdf_rect[RECT.LEFT] + dcdf_rect[RECT.WIDTH], dcdf_rect[RECT.HEIGHT]+6)
		ctx.stroke()

		ctx.restore()


		//--------------
		// find y range
		//--------------
		let cdf_y_min = 1.0
		let cdf_y_max = 0.0
		let last_valid_value = 1

		for (let i=0;i<global.extremal_depth.ranked_symbols.length;i++) {
			let symbol = global.extremal_depth.ranked_symbols[i]
			symbol.cdf_current_values = null
			if (symbol.cdf_matrix_row == null) {
				continue
			}
			let k = symbol.cdf_matrix_row.length
			let cdf_current_values = []
			for (let j=0;j<symbol.cdf_matrix_row.length;j++) {
				let value = symbol.cdf_matrix_row[j]
				if (value == undefined) {
					value = last_valid_value
				}
				//--------------
				// if drawing separated values for pointwise depths cdfs
				// dissipate them
				//--------------
				if(global.ui.draw_ed_dcdf_sep.checked) {
					if (j>0) {
						value = symbol.cdf_matrix_row[j] - symbol.cdf_matrix_row[j-1]
					}
				}
				cdf_current_values.push(value)
				last_valid_value = value
				cdf_y_min = Math.min(cdf_y_min, value)
				cdf_y_max = Math.max(cdf_y_max, value)
			}
			symbol.cdf_current_values = cdf_current_values
		}

		let cdf_x_min = 0
		let cdf_x_max = global.extremal_depth.ranked_symbols[0].cdf_matrix_row.length - 1

		function dcdf_rect_map(x, y) {
			let px = dcdf_rect[RECT.LEFT] + (1.0 * (x - cdf_x_min) / (cdf_x_max - cdf_x_min)) * dcdf_rect[RECT.WIDTH]
			let py = dcdf_rect[RECT.TOP] + (dcdf_rect[RECT.HEIGHT] - 1 - (1.0 * (y - cdf_y_min) / (cdf_y_max - cdf_y_min)) * dcdf_rect[RECT.HEIGHT])
			return [px,py]
		}

		function dcdf_rect_inverse_map(px, py) {
			let x = (px - dcdf_rect[RECT.LEFT]) / dcdf_rect[RECT.WIDTH] * (1.0*(cdf_x_max - cdf_x_min)) + cdf_x_min
			let y = -((((py - dcdf_rect[RECT.TOP] - dcdf_rect[RECT.HEIGHT] + 1) * (1.0 * (cdf_y_max - cdf_y_min))) / dcdf_rect[RECT.HEIGHT]) - cdf_y_min)
			return [x,y]
		}

		//--------------
		//y grid lines and ticks
		//--------------
		let y_num_ticks = 10
		let y_ticks = []
		for(let i=0; i<y_num_ticks; i++) {
			let y_tick = cdf_y_min+((1.0*i*(cdf_y_max-cdf_y_min))/(y_num_ticks-1))
			y_ticks.push(y_tick)
		}

		// console.log(y_ticks)

		for(let i=0; i<y_ticks.length; i++) {
			ctx.strokeStyle = "#555555";
			ctx.lineWidth   = 1;

			let p0 = dcdf_rect_map(cdf_x_min, y_ticks[i])
			let p1 = dcdf_rect_map(cdf_x_max, y_ticks[i])

			ctx.beginPath()
			ctx.moveTo(p0[0], p0[1])
			ctx.lineTo(p1[0], p1[1])
			ctx.stroke()

			ctx.font = "bold 10pt Courier"
			ctx.fillStyle = "#FFFFFF"
			if(i==(y_ticks.length-1)) {
				ctx.fillText(y_ticks[i].toFixed(2), p0[0]-20, p0[1]+8);
			} else {
				ctx.fillText(y_ticks[i].toFixed(2), p0[0]-20, p0[1]+5);
			}

		}

		//--------------
		//x axis grid lines and ticks
		//--------------
		let x_num_ticks = 8
		let x_ticks = []
		for(let i=0; i<x_num_ticks; i++) {
			let x_tick = Math.floor(cdf_x_min+(i*((cdf_x_max-cdf_x_min)/(x_num_ticks-1))))
			x_ticks.push(x_tick)
		}

		// console.log(x_ticks)

		for(let i=0; i<x_ticks.length; i++) {
			ctx.strokeStyle = "#555555";
			ctx.lineWidth   = 1;

			let p0 = dcdf_rect_map(x_ticks[i], cdf_y_min)
			let p1 = dcdf_rect_map(x_ticks[i], cdf_y_max)

			ctx.beginPath()
			ctx.moveTo(p0[0], p0[1])
			ctx.lineTo(p1[0], p1[1])
			ctx.stroke()


			ctx.font = "bold 10pt Courier"
			ctx.fillStyle = "#FFFFFF"
			// ctx.translate(p0[0], p0[1]+42);
			// ctx.rotate(-Math.PI/4);
			ctx.fillText((x_ticks[i]/cdf_x_max).toFixed(2), p0[0], p0[1]+15);
		}

		let min_distance_threshold = 5 * 5
		let closest_distance = 100000

		function update_dcdf_closest_point(symbol, px, py) {
			let dx = local_mouse_pos[0] - px
			let dy = local_mouse_pos[1] - py
			let dist = dx * dx + dy * dy
			if (dist <= min_distance_threshold && dist < closest_distance) {
				ed_cdf_closest_symbol = symbol
			}
		}

		function update_dcdf_closest_segment(symbol, p0x, p0y, p1x, p1y) {
			// a --> p0 to mouse
			// b --> p0 to p1
			// a.b = |a|*|b|*cos(Theta)
			// a.b/|b| = |a|*cos(theta)
			// |a|^2 - (|a|*cos(theta))^2 = h^2
			// |a|^2 - (a.b/|b|)^2 = h^2
			let ax = local_mouse_pos[0] - p0x
			let ay = local_mouse_pos[1] - p0y

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
				ed_cdf_closest_symbol = symbol
			}
		}

		function draw_symbol_dcdf(symbol, focused) {

			let cdf_current_values = symbol.cdf_current_values
			if (cdf_current_values == null) {
				// console.log("Not drawing cdf for symbol ", symbol.name);
				return;
			}

			let i = global.chart_symbols.indexOf(symbol)
			if (symbol.data == null) {
				return
			}

			let color = "#FFFFFF44"

			if (focused) {
				ctx.lineWidth = 4
				color = global.chart_colors[i]
			} else {
				ctx.lineWidth = 2
			}

			ctx.strokeStyle = color

			let first_point_drawn = false

			ctx.beginPath()
			let p_prev = null
			for (let j=0;j<cdf_current_values.length;j++) {
				let yi = cdf_current_values[j]
				let p = dcdf_rect_map(j,yi)
				if (p_prev) {
					update_dcdf_closest_segment(symbol, p_prev[0], p_prev[1], p[0], p[1])
				}
				// update_dcdf_closest_point(symbol, p[0], p[1])
				p_prev = p
				if (!first_point_drawn) {
					ctx.moveTo(p[0],p[1])
					first_point_drawn = true
				} else {
					ctx.lineTo(p[0],p[1])
				}
			}
			ctx.stroke()
		}

		for (let i=0;i<global.extremal_depth.ranked_symbols.length;i++) {

			let symbol = global.extremal_depth.ranked_symbols[i]

			draw_symbol_dcdf(symbol, false)
		}

		if (global.focused_symbol != null) {

			draw_symbol_dcdf(global.focused_symbol, true)

			let text = `symbol: ${global.focused_symbol.name} `
			ctx.font = '14px Monospace';
			ctx.textAlign = 'center';
			ctx.fillText(text, (dcdf_rect[0]+dcdf_rect[2])-(dcdf_rect[2]/2), 40);

		}

		for (let i=0; i<global.red_filters.length; i++) {
			let filter =  global.red_filters[i]

			let local_filter_startpos = get_local_position(filter.startpos, canvas)
			let local_filter_endpos = get_local_position(filter.endpos, canvas)

			ctx.strokeStyle = "#FF0000"
			ctx.beginPath()
			ctx.moveTo(local_filter_startpos[0], local_filter_startpos[1])
			ctx.lineTo(local_filter_endpos[0], local_filter_endpos[1])
			ctx.stroke()

		}

		for (let i=0; i<global.blue_filters.length; i++) {
			let filter =  global.blue_filters[i]

			let local_filter_startpos = get_local_position(filter.startpos, canvas)
			let local_filter_endpos = get_local_position(filter.endpos, canvas)

			ctx.strokeStyle = "#0000FF"
			ctx.beginPath()
			ctx.moveTo(local_filter_startpos[0], local_filter_startpos[1])
			ctx.lineTo(local_filter_endpos[0], local_filter_endpos[1])
			ctx.stroke()

		}

	} // ed-cdf drawings

	if (ts_closest_symbol != null) {
		global.focused_symbol = ts_closest_symbol
	} else {
		global.focused_symbol = ed_cdf_closest_symbol
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

		const { instance } = await WebAssembly.instantiateStreaming( fetch("tsvis.wasm") );

		let heap_size = instance.exports.memory.buffer.byteLength
		global.tsvis_wasm_module = instance
		global.tsvis_wasm_module.exports.tsvis_heap_init(heap_size)

		let result = await fetch('http://localhost:8888/desc')
		let symbol_names = await result.json()
		let symbols = []
		for (let i=0;i<symbol_names.length;i++) {
			symbols.push({ name:symbol_names[i], ui_row:null, ui_col:null,
						   on_table:true, on_chart:false, data: null,
						   ts_current_values: null, ed_rank:null, mbd_rank:null })
		}
		global.symbols = symbols
		global.toggle_state = 0

		prepare_ui();
		setTimeout(update, 32)

	} catch (e) {
		console.log("Fatal Error: couldn't download data")
		return
	}
}
