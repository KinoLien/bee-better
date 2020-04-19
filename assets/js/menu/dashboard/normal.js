
var dateRangePicker = $("#daterangePicker"),
	deviceSelect = $("#chosen-device"),
	propertiesSelect = $("#chosen-properties"),
	chartWrap = $(".flot-chart"),
	logTitle = $("#log-title");

var maxDate = new Date();

var initDateRange = [moment().subtract(3, 'days'), moment()];

var flotLineChart = new DeviceChart({ appendTo: chartWrap, yMax: 100, yMin: 0 });

var dateMapLogs = {};

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

function tuneChartHeight(){
	var iboxWrap = chartWrap.parents(".ibox"),
		mainWrap = iboxWrap.parents(".wrapper-content");

	var iboxStyles = getComputedStyle(iboxWrap.get(0)),
		mainStyles = getComputedStyle(mainWrap.get(0));

	var calculateHeight = $(window).height() - chartWrap.offset().top - 
		parseInt(iboxStyles["margin-bottom"]) - parseInt(mainStyles["padding-top"]) - 
		parseInt(mainStyles["padding-bottom"]);

	chartWrap.height(calculateHeight);
}

function triggerLoadChartData(){
	var rangeDate = dateRangePicker.data('daterangepicker');

	var deviceName = deviceSelect.val();

	if ( !deviceName ) return;

	// open loading spinner
	chartWrap.parent().addClass("sk-loading");

	// reset
	dateMapLogs = {};
	logTitle.text("");

	Promise.all([
		loadDeviceData({
			deviceName: deviceName,
			dateFrom: rangeDate.startDate,
			dateTo: rangeDate.endDate
		}).then(function(res){
			flotLineChart.setData({ data: res[0], dateFrom: rangeDate.startDate, dateTo: rangeDate.endDate });
			flotLineChart.setPropsShow(propertiesSelect.val());
		}),
		Promise.resolve($.getJSON("/api/dailylist/" + deviceName, {
				start: moment(rangeDate.startDate).format("YYYY-MM-DD"),
				end: moment(rangeDate.endDate).format("YYYY-MM-DD")
			}))
			.then(function(res){
				res.forEach(function(log){
					dateMapLogs[log.date] = {
						title: log.title,
						content: log.content
					};
				});
			})
	])
	.then(function(){

		var theMarkings = Object.keys(dateMapLogs)
			.map(function(datestr){
				var mDate = moment(datestr);
				return {
					from: mDate.startOf('day').toDate().getTime(),
					to: mDate.endOf('day').toDate().getTime(),
					color: "#feffd1"
				}
			});

		flotLineChart.setMarkings(theMarkings);

		// close loading spinner
		chartWrap.parent().removeClass("sk-loading");
	});
}

dateRangePicker.on('apply.daterangepicker', triggerLoadChartData);

deviceSelect.change(triggerLoadChartData);

propertiesSelect.change(function(){
	flotLineChart.setPropsShow(propertiesSelect.val());
});

tuneChartHeight();

flotLineChart.onHover(function(stamp, value, item){
	var message = "",
		datestr = moment(Math.ceil(stamp)).format("YYYY-MM-DD");
	if ( dateMapLogs[datestr] ) {
		message = dateMapLogs[datestr].title;
	}
	logTitle.text(message);
});

$(".line-chart a[csv-export]").click(function(){ 
	var rangeDate = dateRangePicker.data('daterangepicker'),
		deviceName = deviceSelect.val(),
		filename = [
			deviceName, 
			rangeDate.startDate.format("YYMMDDHHmm"), 
			rangeDate.endDate.format("YYMMDDHHmm")
		].join("_");
	
	flotLineChart.exportRaw(propertiesSelect.val(), filename);
});

