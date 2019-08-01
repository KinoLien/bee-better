
var dateRangePicker = $("#daterangePicker"),
	deviceSelect = $("#chosen-device"),
	propertiesSelect = $("#chosen-properties"),
	flotLineChart = $("#flot-line-chart");

var maxDate = new Date();

var initDateRange = [moment().subtract(3, 'days'), moment()];

var maxChartPoints = 500;

var currentPlot = null;

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
        content: function(data, x, y, dataObject) {
        	if ( currentPlot ) {
        		var XdataIndex = dataObject.dataIndex;
        		var currentAllData = currentPlot.getData();
        		var outputs = [];
        		currentAllData.forEach(function(series){
        			outputs.push(series.label + ": " + parseFloat(series.data[XdataIndex][1]).toFixed(2) );
        		});
        		return "<b>%x</b> <br/>" + outputs.join("<br/>");
        	} else return null;
	    },
        xDateFormat: "%m/%d %H:%M"
    }
};

flotLineChart.bind("plothover", function (event, pos, item) {
	if ( currentPlot ) {
		currentPlot.getOptions().grid.markings = [{
			xaxis: {
				from: pos.x,
				to: pos.x
			},
			color: "#ececec"
		}];
		currentPlot.setupGrid();
		currentPlot.draw();
	}
});

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
		currentPlot = $.plot(flotLineChart, datasets, plotOptions);
	} else currentPlot = null;
}

function triggerLoadChartData(){
	var rangeDate = dateRangePicker.data('daterangepicker');

	var deviceName = deviceSelect.val();

	if ( !deviceName ) return;

	var endISOStr = rangeDate.endDate.toISOString();
	var startISOStr = rangeDate.startDate.toISOString();

	if ( currentDevice == deviceName && currentEnd == endISOStr && currentStart == startISOStr) return;
	else {
		currentDevice = deviceName; currentEnd = endISOStr; currentStart = startISOStr;
	}

	var rangeMaxTime = rangeDate.endDate.toDate().getTime();
	var rangeMinTime = rangeDate.startDate.toDate().getTime();
	var rangeDateDiff = rangeMaxTime - rangeMinTime;

	var params = {
		end: currentEnd,
		start: currentStart
	};

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

			var slicePoints = Math.min( maxChartPoints, rangeDateDiff / unitStep );
			if ( slicePoints == maxChartPoints ) {
				unitStep = Math.floor( rangeDateDiff / slicePoints );
			}

			var pointStamps = [], stampTick = minStamp;
			// fit stamps before minStamp
			while( stampTick - rangeMinTime >= unitStep ) {
				stampTick -= unitStep;
				pointStamps.unshift(stampTick);
			}
			// fit stamps after minStamp
			stampTick = minStamp;
			do {
				pointStamps.push(stampTick);
				stampTick += unitStep;
			} while( stampTick <= rangeMaxTime );

			// init stamp to items
			var stampToItems = {};
			pointStamps.forEach(function(stamp){
				stampToItems[stamp] = [];
			});

			// time alignment
			var firstPointStamp = pointStamps[0];
			res.forEach(function(item){
				var stamp = item["Time_localstamp"];

				// find index
				var pointStampIdx = Math.round( Math.abs( stamp - firstPointStamp ) / unitStep );

				if ( pointStampIdx >= pointStamps.length ) pointStampIdx = pointStamps.length - 1;
				stampToItems[ pointStamps[pointStampIdx] ].push(item);
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

			pointStamps.forEach(function(pointStamp){
				var items = stampToItems[pointStamp];
				if ( items && items.length ) {
					propKeys.forEach(function(propKey){

						var propAvg = items.map(function(item){ return item[propKey]; })
							.reduce(function(acc, cur){ 
								if ( isNaN(cur) ) return acc;
								else if ( isNaN(acc) ) return cur;
								else return acc + cur;
							})
							/ items.length;

						propAvg = isNaN(propAvg) ? null : propAvg;

						propKeyMapData[propKey].data.push( [ pointStamp, propAvg ] );
					});
				} else {
					propKeys.forEach(function(propKey){
						propKeyMapData[propKey].data.push( [ pointStamp, null ] );
					});
				}
			});

			drawPlotChart();

			// close loading spinner
			flotLineChart.parents(".ibox-content").removeClass("sk-loading");
		});
}

dateRangePicker.on('apply.daterangepicker', triggerLoadChartData);

deviceSelect.change(triggerLoadChartData);

propertiesSelect.change(drawPlotChart);
