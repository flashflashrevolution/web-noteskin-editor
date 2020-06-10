var html_colours = ["Receptor", "Red", "Blue", "Purple", "Yellow", "Pink", "Orange", "Cyan", "Green", "White"];
var html_directions = ["L", "D", "U", "R"];
var html_directions_full = ["left", "down", "up", "right"];

var image_width = 0;
var image_height = 0;
var image_base64 = "";

var grid_width = 5;
var grid_height = 2;

var advance_mode = false;
var quick_mode = false;
var quick_mode_index = -1;
var quick_mode_key = "";

var noteskin_struct = getBaseStructure();

const ColorItem = ({ color, title }) => `
	<span>${title} Cell:</span><input type="text" autocomplete="off" class="cell-field down-${color}" data-color="${color}" data-direction="down" value="" title="Comma Delimited: 0,0" /><br>
`;
const ColorItemFull = ({ color, title }) => `
	<div class="color-block-container">
		<div class="title" data-color="${color}">${title}</div>
		<div class="color-block color-${color}" style="display:none;">
			<span>Down Cell</span><input type="text" autocomplete="off" class="cell-field down-${color}" data-color="${color}" data-direction="down" value="" title="Comma Delimited: 0,0" /><br>
			<span>Left Cell</span><input type="text" autocomplete="off" class="cell-field left-${color}" data-color="${color}" data-direction="left" value="" title="Optional" /><br>
			<span>Up Cell</span><input type="text" autocomplete="off" class="cell-field up-${color}" data-color="${color}" data-direction="up" value=""title="Optional" /><br>
			<span>Right Cell</span><input type="text" autocomplete="off" class="cell-field right-${color}" data-color="${color}" data-direction="right" value=""title="Optional" /><br>
		</div>
	</div>
`;

$(function() {
	$('input[class*=grid-]').change(gridChangeEvent);
	
	// Image Loading
	$('.load_image').on('click', function() {
		$('#image-input').trigger('click');
	});
	$("#image-input").change(function() {
		readImage(this);
	});
	$('.image-dummy').on( "load", function(){
		image_width = this.width;
		image_height = this.height;
		image_base64 = this.getAttribute("src");
		$('.image').attr('style', "width: " + image_width + "px;height:" + image_height + "px;background-image: url('" + image_base64 + "')");
		//$('.image').attr('style', "width: " + image_width + "px;height:" + image_height + "px;");
		gridChangeEvent();
	});
	
	// Import JSON
	$('.load_json').on('click', function() {
		var res = prompt("Paste JSON String:");
		
		if(res == null || res == "")
			return;
		
		readJSON(res);
	});
	
	// Export JSON
	$('.export_json').click(exportJSON);
	
	// Cell Editor
	$(".toggle_advance").click(function() {
		advance_mode = !advance_mode;
		$('#color_selector',).toggle();
		$('#color_selector_full').toggle();
	});
	
	$(".toggle_quick_setup").click(quickSetupStart);
	$(".end_quick_setup").click(quickSetupEnd);
	
	// Cell Selectors
	var color_map = [];
	$.each(html_colours, function(index, value) {
		color_map.push({"title": value, "color": value.toLowerCase()});
	});
	$('#color_selector').prepend(color_map.map(ColorItem).join(''));
	$('#color_selector_full').html(color_map.map(ColorItemFull).join(''));
	$('.color-block-container .title').click(colorSelectorClick);
	openColorSelector("receptor");
	
	$( ".cell-field" ).hover(
		function() {
			var cell = $(this).val();
			var cell_value = parse_cell_text(cell, 0, 20);
			var cell_str = cell_value[0] + "," + cell_value[1];
			$("div[data-attr|='" + cell_str + "']").addClass( "hover" );
		}, function() {
			$(".image div").removeClass( "hover" );
		}
	);
});

function readImage(input) {
	if (input.files && input.files[0]) {
		var reader = new FileReader();
		reader.onload = function(e) {
			$('.image-dummy').attr('src', e.target.result);
		}
		reader.readAsDataURL(input.files[0]);
	}
}

function readJSON(string) {
	try {
		var res = JSON.parse(string);
	}
	catch(e) {
		alert("Invalid JSON");
		return;
	}
	
	if(res["data"] == null || res["rects"] == null) {
		alert("Invalid JSON");
		return;
	}
	
	var imageData = res["data"];
	var imageType = "png";
	
	// Figure out image type by shortcutting.
	switch(imageData.charAt(0)) {
		case '/': imageType = "jpg"; break;
		case 'i': imageType = "png"; break;
		case 'R': imageType = "gif"; break;
		case 'U': imageType = "webp"; break;
	}
	
	// Merge Differences
	noteskin_struct = getBaseStructure();
	object_merge(noteskin_struct, res["rects"]);
	
	// Set Fields
	$('.image-dummy').attr('src',  "data:image/" + imageType + ";base64," + imageData);
	$('.noteskin-name').val(res["name"]);
	
	var grid_dim = parse_cell_text(noteskin_struct["options"]["grid_dim"], 1, 20);
	$(".grid-width").val(grid_dim[0]);
	$(".grid-height").val(grid_dim[1]);
	$(".global-rotation").val(noteskin_struct["options"]["rotate"]);
	
	for(var color of html_colours) {
		color = color.toLowerCase();
		for(var dir in html_directions_full) {
			$("." + html_directions_full[dir] + "-" + color).val(noteskin_struct[color][html_directions[dir]]["c"]);
		}
	}
}

function exportJSON() {
	// Write Changes into Structure
	noteskin_struct["options"]["grid_dim"] = grid_width + "," + grid_height;
	noteskin_struct["options"]["rotate"] = $(".global-rotation").val();
	
	for(var color of html_colours) {
		color = color.toLowerCase();
		for(var dir in html_directions_full) {
			noteskin_struct[color][html_directions[dir]]["c"] = $("." + html_directions_full[dir] + "-" + color).val();
		}
	}
	
	// Generate JSON
	var image_string = $('.image-dummy').attr('src');
	image_string = image_string.substr(image_string.indexOf(";base64,") + 8);
	var export_json = {"name": $('.noteskin-name').val(),
		"data": image_string,
		"rects": object_differences(getBaseStructure(), noteskin_struct)
	};
	
	$(".export_area").show();
	$(".export_field").val(JSON.stringify(export_json));
	$(".export_field").select();
}

function gridChangeEvent() {
	grid_width = clamp($(".grid-width").val(), 1, 20);
	grid_height = clamp($(".grid-height").val(), 1, 20);
	
	updateCellDisplay();
}

function updateCellDisplay() {
	var elm = $('.image');
	
	elm.empty();
	
	for(var iy = 0; iy < grid_height; iy++) {
		for(var ix = 0; ix < grid_width; ix++) {
			elm.append('<div data-attr="' + ix + ',' + iy + '"><span>' + ix + ',' + iy + '</span></div>');
		}
	}
	
	elm.css("grid-template-columns", "repeat(" + ix + ", 1fr)");
	elm.css("grid-template-rows", "repeat(" + iy + ", 1fr)");
	
	if(quick_mode)
		quickSetupCellBind();
}

function colorSelectorClick(event) {
	openColorSelector($(event.currentTarget).attr("data-color"));
}

function openColorSelector(color) {
	$(".color-block").hide();
	$(".color-" + color).show();
	$(".down-" + color).focus();
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Quick Setup Basic
function quickSetupStart() {
	quick_mode = true;
	$("#quickSetupModel").show();
	quickSetupCellBind();
	quickSetupNext();
}

function quickSetupEnd() {
	$("#quickSetupModel").hide();
	quickSetupCellBindRemove();
	quick_mode_index = -1;
	quick_mode = false;
}

function quickSetupNext() {
	quick_mode_index++;
	
	if(quick_mode_index >= html_colours.length) {
		quickSetupEnd();
		return;
	}
	
	quick_mode_key = (html_colours[quick_mode_index]);
	$("#quickSetupModel .key").text(quick_mode_key);
	quick_mode_key = quick_mode_key.toLowerCase();
}

function quickSetupCellClick(e) {
	var cell = $(e.currentTarget).attr("data-attr");
	$(".down-" + quick_mode_key).val(cell);
	quickSetupNext();
}

function quickSetupCellBind() {
	$( ".image div" ).click(quickSetupCellClick);
	$( ".image div" ).hover(
		function() {
			$( this ).addClass( "hover" );
		}, function() {
			$( this ).removeClass( "hover" );
		}
	);
}

function quickSetupCellBindRemove() {
	$( ".image div" ).off( "click mouseenter mouseleave" );
	$( ".image div" ).removeClass( "hover" );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getBaseStructure() {
	var out = {
		"options": {
			"rotate": "90",
			"grid_dim": "5,2"
		}
	}
	for(var color of html_colours) {
		color = color.toLowerCase();
		out[color] = {};
		for(var dir of html_directions) {
			out[color][dir] = {"c": "", "r": ""};
		}
	}
	return out;
}

function clamp(val, min, max) {
	if(isNaN(val) || !isFinite(val) || val < min)
		return min;
	else if(val > max)
		return max;
	return val;
}

function parse_cell_text(text, min, max) {
	var out = [1, 1];
	var cell_values = text.split(",");
	if (cell_values.length >= 2)
	{
		out[0] = parseInt(cell_values[0]);
		out[1] = parseInt(cell_values[1]);
	}
	else if (cell_values.length == 1)
		out[0] = out[1] = parseInt(cell_values[0]);
	
	out[0] = clamp(out[0], min, max);
	out[1] = clamp(out[1], min, max);
	return out;
}

function object_merge(main, json) {
	if (json == null)
		return;
	
	if (main == null) {
		main = json;
		return;
	}
	
	for (var item in json) {
		if (main[item] == null)
			continue;
		if (typeof json[item] == "string" || typeof json[item] == "number")
			main[item] = json[item];
		else if (typeof main[item] == "object")
			object_merge(main[item], json[item]);
	}
}

function object_differences(main, changed) {
	var out = null;
	
	for (var item in main) {
		if (changed[item] == null)
			continue;
		
		if (typeof main[item] == "string" || typeof main[item] == "number") {
			if (main[item] != changed[item]) {
				if (!out) out = {};
				out[item] = changed[item];
			}
		}
		else if (typeof main[item] == "object") {
			var diffs = object_differences(main[item], changed[item]);
			if (diffs) {
				if (!out) out = {};
				out[item] = diffs;
			}
		}
	}
	return out;
}