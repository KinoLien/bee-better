var dateRangePicker = $("#daterangePicker"),
    deviceSelect = $("#chosen-device"),
    propertiesSelect = $("#chosen-properties"),
    // chartWrap = $(".flot-chart"),
    searchBtn = $("#searchBtn"),
    pageRoot = $("#page-wrapper .wrapper-content");

var maxDate = new Date();

// var flotLineChart = new DeviceChart({ appendTo: chartWrap });
var flotCharts = [];

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
    locale: datePickerLocale,
    ranges: constDateRanges,
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
        rowWrap = $('<div class="row"></div>'),
        flotChartsWrap;

    // remove current if exist
    pageRoot.children(".row").remove();
    flotCharts = [];

    properties.forEach(function(propName){
        rowWrap.append(`
            <div class="col-lg-12">
                <line-chart-panel title="${propName}" loading></line-chart-panel>
            </div>
        `);
    });

    pageRoot.append(rowWrap);

    flotChartsWrap = rowWrap.find(".flot-chart");

    flotChartsWrap.each(function(){
        flotCharts.push(new DeviceChart({ appendTo: $(this) }));
    });

    loadDeviceData({
        deviceName: deviceNames,
        dateFrom: rangeDate.startDate,
        dateTo: rangeDate.endDate
    })
    .then(function(results){

        function findNearNumber(target, items, minStep){
            for(let i = 0, len = items.length - 1; i < len; i++) {
                if ( target >= items[i] && target <= items[i + 1] ) {
                    let halfDiff = minStep / 2;
                    if ( target - items[i] <= halfDiff ) {
                        return items[i];
                    } else if ( items[i + 1] - target <= halfDiff ) {
                        return items[i+1];
                    }
                }
            }
            return null;
        }

        let minStamp = Number.MAX_SAFE_INTEGER,
            maxStamp = 0;

        let allStampMaps = [];
        // collect stamps for each
        let allStamps = results.map(function(res){
            let curStampMap = {};
            let resStamps = res.map(function(d){ 
                let theStamp = d["Time_localstamp"];
                // avoid bug
                if ( isNaN(theStamp) ) return null;
                curStampMap[theStamp] = d;
                minStamp = Math.min(minStamp, theStamp);
                maxStamp = Math.max(maxStamp, theStamp);
                return theStamp;
            });
            allStampMaps.push(curStampMap);
            return resStamps.filter(function(s){ return s != null; });
        });

        let minStep = allStamps.map(function(stamps){
            let m = Number.MAX_SAFE_INTEGER;
            for ( let i = 0, len = stamps.length - 1; i < len ; i++){
                let ns = stamps[i + 1], cs = stamps[i];
                m = Math.min(m, ns == cs ? m : ns - cs);
            }
            return m;
        }).sort()[0];

        let totalTicksMap = {};
        let totalTicksArray = [];
        let tick = minStamp;
        while ( tick <= maxStamp ) {
            totalTicksArray.push(tick);
            if ( !totalTicksMap[tick] ) totalTicksMap[tick] = [];
            allStamps.forEach(function(stamps, sidx){
                let nearStamp = findNearNumber(tick, stamps, minStep);
                totalTicksMap[tick][sidx] = nearStamp ? allStampMaps[sidx][nearStamp] : null;
            });
            tick += minStep;
        }

        let propsData = [];

        properties.forEach(function(prop){
            let singlePropCollect = [];
            totalTicksArray.forEach(function(tick){
                let data = { "Time_localstamp": tick };
                deviceNames.forEach(function(dname, didx){
                    data[dname] = totalTicksMap[tick][didx] ? totalTicksMap[tick][didx][prop] : null;
                });
                singlePropCollect.push(data);
            });
            propsData.push(singlePropCollect);
        });

        // seems OK
        // console.log(propsData);
        propsData.forEach(function(collect, idx){
            let targetChart = flotCharts[idx];
            targetChart.setData({
                data: collect,
                dateFrom: rangeDate.startDate,
                dateTo: rangeDate.endDate
            });
            targetChart.setPropsShow(deviceNames);
        });

        // close loading spinner
        flotChartsWrap.parent().removeClass("sk-loading");
    });
});
