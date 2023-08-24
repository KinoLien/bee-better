
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
        // maxBound: 100,
        // minBound: 0
        // rightProp
        // yMax
        // yMin
        // labelsMap
        // unitsMap
        // computedMap
    };

    var _getLabel = function(ins, v) {
        var map = ins._options.labelsMap;
        if (typeof map !== "undefined" && typeof map[v] === "string") {
            return map[v];
        }
        return v;
    };

    var _getUnit = function(ins, p) {
        var map = ins._options.unitsMap;
        if (typeof map !== "undefined" && typeof map[p] === "string") {
            return map[p];
        }
        return "";
    };

    var _getComputed = function(ins, p, v) {
        var map = ins._options.computedMap;
        if (typeof map !== "undefined" && typeof map[p] === "function") {
            return map[p](v);
        }
        return v;
    };

    function dc(options){
        var self = this;

        self._options = _assign(_defaultOptions, options || {});

        self._el = $('<div class="flot-chart-content"></div>');

        $(self._options.appendTo).append(self._el);

        var customPlotOpts = {
            tooltipOpts: {
                content: (function(ins){
                    return function(data, x, y, dataObject) {
                        if (!ins._plot) return null;
                        var XdataIndex = dataObject.dataIndex;
                        var currentAllData = ins._plot.getData();
                        var outputs = [];
                        currentAllData.forEach(function(series){
                            var val = series.data[XdataIndex][1];
                            if ( val ) outputs.push(series.label + ": " + parseFloat(val).toFixed(2) + _getUnit(ins, series.label) );
                        });
                        return "<b>%x</b> <br/>" + outputs.join("<br/>");
                    };
                })(self)
            }
        };

        if ( typeof options.rightProp === "string" ) {
            customPlotOpts.yaxes = [
                { position: "left" },
                {
                    position: "right",
                    color: "black",
                    axisLabel: _getLabel(self, options.rightProp),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 3
                }
            ];
        } else {
            customPlotOpts.yaxes = { position: 'left' };
        }

        // yMax and yMin
        if ( typeof options.yMax != "undefined" ) {
            if ( typeof options.rightProp === "string" ) {
                var yMaxIsArray = Array.isArray(options.yMax);
                var yMax0 = yMaxIsArray ? options.yMax[0] : options.yMax;
                var yMax1 = yMaxIsArray ? options.yMax[1] : undefined;
                customPlotOpts.yaxes[0] = _assign(customPlotOpts.yaxes[0], { max: yMax0 });
                customPlotOpts.yaxes[1] = _assign(customPlotOpts.yaxes[1], { max: yMax1 });
            } else {
                customPlotOpts.yaxes = _assign(customPlotOpts.yaxes || {}, { max: options.yMax });
            }
        }
        if ( typeof options.yMin != "undefined" ) {
            if ( typeof options.rightProp === "string" ) {
                var yMinIsArray = Array.isArray(options.yMin);
                var yMin0 = yMinIsArray ? options.yMin[0] : options.yMin;
                var yMin1 = yMinIsArray ? options.yMin[1] : undefined;
                customPlotOpts.yaxes[0] = _assign(customPlotOpts.yaxes[0], { min: yMin0 });
                customPlotOpts.yaxes[1] = _assign(customPlotOpts.yaxes[1], { min: yMin1 });
            } else {
                customPlotOpts.yaxes = _assign(customPlotOpts.yaxes || {}, { min: options.yMin });
            }
        }

        self._plotOps = _assign(_plotOptions, customPlotOpts);

        self._stampMapData = null;

        self._el.bind("plothover", function (event, pos, item) {
            if (!self._plot) return;
            self._plot.getOptions().grid.markings = (self._customMarkings || []).concat([{
                xaxis: {
                    from: pos.x,
                    to: pos.x
                },
                color: "#ececec"
            }]);
            self._plot.setupGrid();
            self._plot.draw();

            // for all points highlight
            self._plot.unhighlight();
            if (item) {
                for (var i = 0; i < self._propCount; i++) {
                    self._plot.highlight(i, item.dataIndex);
                }
            }
        });

    }

    dc.prototype.setData = function({ data, dateFrom, dateTo }){
        let self = this;

        // collect raw data
        self._rawData = data;

        // reset
        self._pointStamps = [];
        self._stampMapData = null;

        let maxPoints = self._options.maxPoints,
            rangeMaxTime = moment(dateTo).toDate().getTime(),
            rangeMinTime = moment(dateFrom).toDate().getTime(),
            rangeDateDiff = rangeMaxTime - rangeMinTime;

        // find unit step
        var unitStep = Number.MAX_SAFE_INTEGER,
            // maxStep = 1000 * 60 * 5, // 5 mins
            minStamp, maxStamp;
        if ( data.length > 1 ) {
            for(var i = 0, len = data.length - 1; i < len ; i++) {
                var item = data[i];
                var nextItem = data[i+1];

                var diff = nextItem["Time_localstamp"] - item["Time_localstamp"];
                if (diff > 0)
                    unitStep = Math.min( unitStep, diff );
            }
            minStamp = data[0]["Time_localstamp"];
            maxStamp = data[data.length - 1]["Time_localstamp"];
        } else {
            minStamp = maxStamp = ( data[0] ? data[0]["Time_localstamp"] : 0 );
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
        data.forEach(function(item){
            var stamp = item["Time_localstamp"];

            // find index
            var pointStampIdx = Math.round( Math.abs( stamp - firstPointStamp ) / unitStep );

            if ( pointStampIdx >= pointStamps.length ) pointStampIdx = pointStamps.length - 1;

            var stkey = pointStamps[pointStampIdx];
            if ( stampToItems[stkey] ) stampToItems[stkey].push(item);
        });

        self._pointStamps = pointStamps;
        self._stampMapData = stampToItems;
    };

    dc.prototype.setPropsShow = function(props){
        var self = this;
        if ( !self._stampMapData || self._pointStamps.length == 0 ) return;

        var rightProp = self._options.rightProp;
        var rightExist = typeof rightProp === "string";
        var datasets = [];
        var propKeyMapData = {};

        props.forEach(function(item){
            var isStr = typeof item == "string",
                propKey = isStr ? item : item.value,
                propLabel = isStr ? _getLabel(self, item) : item.label;
            propKeyMapData[propKey] = {
                label: propLabel,
                data: []
            };
            if (rightExist) {
                propKeyMapData[propKey].yaxis = (propKey === rightProp) ? 2 : 1;
            }
        });
        
        var propKeys = Object.keys(propKeyMapData);

        var isValidValue = (function(keys){
            var maxB = self._options.maxBound;
            var minB = self._options.minBound;

            var maxBIsArray = Array.isArray(maxB);
            var minBIsArray = Array.isArray(minB);

            var maxB0 = maxBIsArray ? maxB[0] : maxB;
            var maxB1 = maxBIsArray ? maxB[1] : undefined;

            var minB0 = minBIsArray ? minB[0] : minB;
            var minB1 = minBIsArray ? minB[1] : undefined;

            var boundMap = {};
            keys.forEach(function(k){
                boundMap[k] = {
                    maxBound: (k === rightProp) ? maxB1 : maxB0,
                    minBound: (k === rightProp) ? minB1 : minB0
                }
            });
            return function(prop, v){
                var bound = boundMap[prop];
                return !isNaN(v) && 
                    (typeof bound.maxBound == "undefined" || v < bound.maxBound) &&
                    (typeof bound.minBound == "undefined" || v > bound.minBound);
            };
        })(propKeys);

        self._pointStamps.forEach(function(pointStamp){
            var items = self._stampMapData[pointStamp];
            if ( items && items.length ) {
                propKeys.forEach(function(propKey){

                    var validValues = items
                        .map(function(item){ return item[propKey]; })
                        .filter(function(v){ return isValidValue(propKey, v); });

                    var propAvg = validValues.reduce(function(acc, cur){ return acc + cur; }, 0) / validValues.length;

                    propAvg = isValidValue(propKey, propAvg) ? propAvg : null;

                    if ( propAvg !== null ) {
                        propAvg = _getComputed(self, propKey, propAvg);
                    }
                    
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

        self._propCount = datasets.length;
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
        self._customMarkings = convertMarkings;
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
