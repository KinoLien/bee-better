
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
        show: true
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
        content: "time: %x  value: %y.2",
        xDateFormat: "%H:%M"
    }
};

var propKeyMapData = null;

var currentDevice, currentEnd, currentStart;

function drawPlotChart(){
	// get properties
	var values = propertiesSelect.val();
	var datasets = [];
	if (values && values.length) {
		values.forEach(function(val){
			if (propKeyMapData[val]) datasets.push(propKeyMapData[val]);
		});
	}
	if (datasets.length) {
		$.plot(flotLineChart, datasets, plotOptions);
	}
}

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
			// console.log(res);

			res.forEach(function(item){
				item["Time_localstamp"] = moment(item["Time_convert"]).toDate().getTime();
			});

			// find unit step
			var unitStep = Number.MAX_SAFE_INTEGER,
				// maxStep = 1000 * 60 * 5, // 5 mins
				minStamp, maxStamp;
			if ( res.length > 1 ) {
				for(var i = 0, len = res.length - 1; i < len ; i++) {
					var item = res[i];
					var nextItem = res[i+1];

					var diff = nextItem["Time_localstamp"] - item["Time_localstamp"];
					if (diff > 0)
						unitStep = Math.min( unitStep, diff );
				}
				minStamp = res[0]["Time_localstamp"];
				maxStamp = res[res.length - 1]["Time_localstamp"];
			} else {
				minStamp = maxStamp = ( res[0] ? res[0]["Time_localstamp"] : 0 );
			}

			// time alignment
			var stampToItem = {};
			res.forEach(function(item){
				var stamp = item["Time_localstamp"];
				var tickIndex = Math.round( ( stamp - minStamp ) / unitStep );
				var correctStamp = minStamp + tickIndex * unitStep;
				if ( correctStamp != stamp && Math.abs(correctStamp - stamp) <= unitStep / 2 ) {
					item["Time_localstamp"] = stamp = correctStamp;
				}
				stampToItem[stamp] = item;
			});

			// propKeyMapData init
			propKeyMapData = {};
			$(propertiesSelect.get(0).options).each(function(idx, item){
				var propKey = item.value;
				propKeyMapData[propKey] = {
					label: item.label,
					data: []
				};
			});

			var propKeys = Object.keys(propKeyMapData);

			// for each tick
			for( var tick = minStamp, idx = 0; tick <= maxStamp; tick += unitStep, idx++ ) {
				// handler(tick, idx);
				var item = stampToItem[tick];
				if ( item ) {
					propKeys.forEach(function(propKey){
						propKeyMapData[propKey].data.push( [ tick, item[propKey] ] );
					});
				} else {
					propKeys.forEach(function(propKey){
						propKeyMapData[propKey].data.push( [ tick, null ] );
					});
				}
			}

			drawPlotChart();

			// close loading spinner
			flotLineChart.parents(".ibox-content").removeClass("sk-loading");
		});
}

dateRangePicker.on('apply.daterangepicker', triggerLoadChartData);

deviceSelect.change(triggerLoadChartData);

propertiesSelect.change(drawPlotChart);
