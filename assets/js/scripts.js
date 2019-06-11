// A $( document ).ready() block.
$( document ).ready(function() {

		// DropCap.js
		var dropcaps = document.querySelectorAll(".dropcap");
		window.Dropcap.layout(dropcaps, 2);

		// Responsive-Nav
		var nav = responsiveNav(".nav-collapse");

		// Round Reading Time
    $(".time").text(function (index, value) {
      return Math.round(parseFloat(value));
    });
});

document.addEventListener("DOMContentLoaded", function(event) {
	anchors.add('article section h1, h2, h3, h4, h5, h6');
	anchors.options.placement = 'left';
});


