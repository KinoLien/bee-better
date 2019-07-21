
var dateRangePicker = $("#daterangePicker"),
	deviceSelect = $("#chosen-device"),
	propertiesSelect = $("#chosen-properties"),
	flotLineChart = $("#flot-line-chart");

var maxDate = new Date();

var initDateRange = [moment().subtract(3, 'days'), moment()];

// for new daterange
dateRangePicker.daterangepicker({
	// minDate: minDate,
	maxDate: maxDate,
	startDate: initDateRange[0],
	// endDate: maxDate,
	timePicker: true,
	timePicker24Hour: true,
	timePickerSeconds: true,
	locale: {
		format: 'YYYY-MM-DD HH:mm:ss'
		// cancelLabel: '取消',
		// applyLabel: '確定',
		// customRangeLabel: '自訂範圍'
	},
	ranges: {
		'Nearly 3 Days': initDateRange,
		'Nearly 7 Days': [moment().subtract(7, 'days'), moment()],
		'Nearly 30 Days': [moment().subtract(30, 'days'), moment()]
	},
	alwaysShowCalendars: true
});

$(".chosen-select").chosen({width: '100%'});

var plotOptions = {
	xaxis: {
    	mode: 'time',
    	timezone: "browser"
    },
    legend: {
        show: false
    },
    colors: ["#1ab394"],
    grid: {
        color: "#999999",
        clickable: true,
        tickColor: "#D4D4D4",
        borderWidth:0,
        hoverable: true //IMPORTANT! this is needed for tooltip to work,
    },
    tooltip: true,
    tooltipOpts: {
        content: "time: %x  value: %y",
        xDateFormat: "%H:%M"
    }
};

var currentDevice, currentEnd, currentStart;

function triggerLoadChartData(){
	var rangeData = dateRangePicker.data('daterangepicker');

	var deviceName = deviceSelect.val();
	var endISOStr = rangeData.endDate.toISOString();
	var startISOStr = rangeData.startDate.toISOString();

	if ( currentDevice == deviceName && currentEnd == endISOStr && currentStart == startISOStr) return;
	else {
		currentDevice = deviceName; currentEnd = endISOStr; currentStart = startISOStr;
	}

	var params = {
		end: currentEnd,
		start: currentStart
	}

	// open loading spinner
	flotLineChart.parents(".ibox-content").addClass("sk-loading");

	Promise.resolve($.getJSON("/api/cells/" + deviceName + "?" + encodeParamPairs(params)))
		.then(function(res){ 
			console.log(res);

			// close loading spinner
			flotLineChart.parents(".ibox-content").removeClass("sk-loading");
		});
}

dateRangePicker.on('apply.daterangepicker', triggerLoadChartData);

deviceSelect.change(triggerLoadChartData);

