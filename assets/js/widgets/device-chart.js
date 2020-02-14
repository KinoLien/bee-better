
(function(scope){

    var _assign = function(source, nextSource){
        var to = {};

        for (var key in source) {
            to[key] = source[key];
        }
        
        for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                if ( Object.prototype.toString.call(nextSource[nextKey]) == "[object Object]"
                    && Object.prototype.toString.call(source[nextKey]) == "[object Object]" ) {
                    to[nextKey] = _assign(source[nextKey], nextSource[nextKey]);
                } else {
                    to[nextKey] = nextSource[nextKey];
                }
            }
        }
        return to;
    };

    var _lessTenAddZero = function(v) { return v < 10? ("0" + v) : v; };

    var _stampToDateFormat = function(stamp){
        var dte = new Date(stamp);
        var year = dte.getFullYear(),
            month = dte.getMonth() + 1,
            day = dte.getDate(),
            hour = dte.getHours(),
            min = dte.getMinutes(),
            sec = dte.getSeconds();
        return [
            [year, _lessTenAddZero(month), _lessTenAddZero(day)].join("-"), 
            [_lessTenAddZero(hour), _lessTenAddZero(min), _lessTenAddZero(sec)].join(":")
        ].join(" ");
    };

    var _plotOptions = {
        xaxis: {
            mode: 'time',
            timezone: "browser"
        },
        yaxis: {
            max: 100
        },
        legend: {
            show: true
        },
        colors: ["#c62828", "#283593", "#00695C", "#F9A825", "#37474F", "#6A1B9A", "#0277BD", "#558B2F", "#EF6C00", "#4E342E"],
        grid: {
            color: "#999999",
            clickable: true,
            tickColor: "#D4D4D4",
            borderWidth:0,
            hoverable: true //IMPORTANT! this is needed for tooltip to work,
        },
        tooltip: true,
        tooltipOpts: {
            xDateFormat: "%m/%d %H:%M"
        }
    };

    var _defaultOptions = {
        appendTo: document.body,
        maxPoints: 500
    };

    function dc(options){
        var self = this;

        self._options = _assign(_defaultOptions, options || {});

        self._el = $('<div class="flot-chart-content"></div>');

        $(self._options.appendTo).append(self._el);

        self._plotOps = _assign(_plotOptions, {
            tooltipOpts: {
                content: (function(ins){
                    return function(data, x, y, dataObject) {
                        if (!ins._plot) return null;
                        var XdataIndex = dataObject.dataIndex;
                        var currentAllData = ins._plot.getData();
                        var outputs = [];
                        currentAllData.forEach(function(series){
                            outputs.push(series.label + ": " + parseFloat(series.data[XdataIndex][1]).toFixed(2) );
                        });
                        return "<b>%x</b> <br/>" + outputs.join("<br/>");
                    };
                })(self)
            }
        });

        self._stampMapData = null;

        self._el.bind("plothover", function (event, pos, item) {
            if (!self._plot) return;
            self._plot.getOptions().grid.markings = [{
                xaxis: {
                    from: pos.x,
                    to: pos.x
                },
                color: "#ececec"
            }];
            self._plot.setupGrid();
            self._plot.draw();
        });

    }

    // dateFrom, dateTo, date, deviceName, props
    dc.prototype.loadData = function(opts){
        var self = this;

        opts = _assign({
            date: new Date()
        }, opts || {});

        if ( !opts.deviceName ) return console.error("DeviceChart: deviceName is missing.");

        // reset
        self._pointStamps = [];
        self._stampMapData = null;

        var startDate = opts.dateFrom ? moment(opts.dateFrom) : moment(opts.date).startOf('day');
        var endDate = opts.dateTo ? moment(opts.dateTo) : moment(opts.date).endOf('day');

        var maxPoints = self._options.maxPoints,
            rangeMaxTime = endDate.toDate().getTime(),
            rangeMinTime = startDate.toDate().getTime(),
            rangeDateDiff = rangeMaxTime - rangeMinTime;

        var params = {
            end: endDate.toISOString(),
            start: startDate.toISOString()
        };

        var url = "/api/cells/" + opts.deviceName + "?" + encodeParamPairs(params);

        return Promise.resolve($.getJSON(url))
            .then(function(res){

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

                var slicePoints = Math.min( maxPoints, rangeDateDiff / unitStep );
                if ( slicePoints == maxPoints ) {
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

                    var stkey = pointStamps[pointStampIdx];
                    if ( stampToItems[stkey] ) stampToItems[stkey].push(item);
                });

                self._pointStamps = pointStamps;
                self._stampMapData = stampToItems;
                self._rawData = res;

                self.setPropsShow(opts.props || []);

                return res;
            });
    };

    dc.prototype.setPropsShow = function(props){
        var self = this;
        if ( !self._stampMapData || self._pointStamps.length == 0 ) return;

        var datasets = [];
        var propKeyMapData = {};

        props.forEach(function(item){
            var isStr = typeof item == "string",
                propKey = isStr ? item : item.value,
                propLabel = isStr ? item : item.label;
            propKeyMapData[propKey] = {
                label: propLabel,
                data: []
            };
        });
        
        var propKeys = Object.keys(propKeyMapData);

        self._pointStamps.forEach(function(pointStamp){
            var items = self._stampMapData[pointStamp];
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

        // var values = propertiesSelect.val();
        props.forEach(function(item){
            var isStr = typeof item == "string",
                propKey = isStr ? item : item.value;
            if (propKeyMapData[propKey]) datasets.push(propKeyMapData[propKey]);
        });

        self._plot = $.plot(self._el, datasets, self._plotOps);
    };

    dc.prototype.exportRaw = function(props, filename){
        var self = this;
        if ( !self._rawData || self._rawData.length == 0 ) return;

        var propKeys = props.map(function(item){
            return typeof item == "string" ? item : item.value;
        });

        var filteredRaws = self._rawData.map(function(d){
            var o = { datetime: _stampToDateFormat(d["Time_localstamp"]) };
            propKeys.forEach(function(k){
                o[k] = d[k];
            });
            return o;
        });

        filteredRaws.reverse();

        var headers = Object.keys(filteredRaws[0]);

        var csvLines = filteredRaws.map(function(tuple){
            return headers.map(function(key){ return tuple[key]; }).join(",");
        });

        // add header
        csvLines.unshift(headers.join(","));
        
        var blob = new Blob([csvLines.join("\r\n")], { type: "text/csv;charset=utf-8" });
        saveAs(blob, filename + ".csv");
    };

    dc.prototype.setMarkings = function(markings){
        var self = this;
        if (!self._plot) return;
        var convertMarkings = [];
        markings.forEach(function(mk){
            convertMarkings.push({
                xaxis: {
                    from: mk.from,
                    to: mk.to
                },
                color: mk.color
            });
        });
        self._plot.getOptions().grid.markings = convertMarkings;
        self._plot.setupGrid();
        self._plot.draw();
    };

    dc.prototype.onHover = function(fn){
        var self = this;
        self._el.bind("plothover", function (event, pos, item) {
            fn(pos.x, pos.y, item);
        });
    };

    scope.DeviceChart = dc;
})(window);
