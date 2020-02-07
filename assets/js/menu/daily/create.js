
var dateRangePicker = $("#daterangePicker");

var maxDate = new Date();

// for new daterange
dateRangePicker.daterangepicker({
	singleDatePicker: true,
	maxDate: maxDate,
	locale: {
		format: 'YYYY-MM-DD'
	}
});

$(".chosen-select").chosen({width: '100%'})
	.css({
		// for validataion
		display: "",
		opacity: 0,
		position: "absolute",
		top: 30,
		left: 0
	});
