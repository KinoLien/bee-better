
var dateRangePicker = $("#daterangePicker"),
	deviceSelect = $("#chosen-device"),
	propertiesSelect = $("#chosen-properties"),
	chartWrap = $(".flot-chart");

var maxDate = new Date();

var flotLineChart = new DeviceChart({ appendTo: chartWrap });

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

function triggerLoadChartData(){
	var rangeDate = dateRangePicker.data('daterangepicker');

	var deviceName = deviceSelect.val();

	if ( !deviceName ) return;

	// open loading spinner
	chartWrap.parent().addClass("sk-loading");

	flotLineChart.loadData({
		deviceName: deviceName,
		props: propertiesSelect.val(),
		date: rangeDate.startDate.format("YYYY-MM-DD")
	})
	.then(function(){
		// close loading spinner
		chartWrap.parent().removeClass("sk-loading");
	});
}

dateRangePicker.on('apply.daterangepicker', triggerLoadChartData);

deviceSelect.change(triggerLoadChartData);

propertiesSelect.change(function(){
	flotLineChart.setPropsShow(propertiesSelect.val());
});
