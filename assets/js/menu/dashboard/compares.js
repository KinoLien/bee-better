var dateRangePicker = $("#daterangePicker"),
    deviceSelect = $("#chosen-device"),
    propertiesSelect = $("#chosen-properties"),
    // chartWrap = $(".flot-chart"),
    searchBtn = $("#searchBtn"),
    pageRoot = $("#page-wrapper .wrapper-content");

var maxDate = new Date();

var initDateRange = [moment().subtract(3, 'days'), moment()];

// var flotLineChart = new DeviceChart({ appendTo: chartWrap });

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
    },
    ranges: {
        'Nearly 3 Days': initDateRange,
        'Nearly 7 Days': [moment().subtract(7, 'days'), moment()],
        'Nearly 30 Days': [moment().subtract(30, 'days'), moment()]
    },
    alwaysShowCalendars: true
});

$(".chosen-select").chosen({width: '100%'})
    .change(function(){
        if ( deviceSelect.val().length && propertiesSelect.val().length ) searchBtn.attr("disabled", false);
        else searchBtn.attr("disabled", true);
    });

$("#searchBtn").click(function(){
    let rangeDate = dateRangePicker.data('daterangepicker'),
        deviceNames = deviceSelect.val(),
        properties = propertiesSelect.val(),
        rowWrap = $('<div class="row"></div>');

    // remove current if exist
    pageRoot.children(".row").remove();

    properties.forEach(function(propName){
        rowWrap.append(`
            <div class="col-lg-12">
                <line-chart-panel title="${propName}" loading></line-chart-panel>
            </div>
        `);
    });

    pageRoot.append(rowWrap);
});
