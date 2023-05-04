customElements.define('line-chart-panel',
    class extends HTMLElement {
        constructor() {
            super();
            let template = document.getElementById('line-chart-panel');
            let templateContent = template.content;

            let valids = [];
            let usedAttrs = Array.prototype.filter.call(template.attributes, function(attr){ return attr.name == "use-attrs"; });
            if ( usedAttrs.length ) {
                valids = usedAttrs[0].value.split(",").map(function(str){ return str.trim(); });
            }

            function getValidAttributes ( node ) {
                var i,
                    attributeNodes = node.attributes,
                    length = attributeNodes.length,
                    attrs = {};

                for ( i = 0; i < length; i++ ) {
                    let name = attributeNodes[i].name;
                    if ( valids.includes(name) ) {
                        attrs[name] = attributeNodes[i].value;
                    }
                }
                return attrs;
            }

            let nodeEl = templateContent.cloneNode(true);

            let propValuesMap = getValidAttributes(this);

            $(nodeEl).find("*").each(function(){
                let targetEl = $(this);

                let ifProp = targetEl.attr("if");
                if ( ifProp ) {
                    let wrapRelated = propValuesMap[ifProp];
                    targetEl.removeAttr("if");
                    if ( typeof wrapRelated == "undefined" || wrapRelated == "false" ) {
                        targetEl.remove();
                    }
                }

                let clsIfProp = targetEl.attr("cls-if");
                // cls-if="loading:sk-loading"
                if ( clsIfProp ) {
                    const [mapkey, classname] = clsIfProp.split(":");
                    let wrapRelated = propValuesMap[mapkey];
                    targetEl.removeAttr("cls-if");
                    if ( typeof wrapRelated != "undefined" || wrapRelated == "true" ) {
                        targetEl.addClass(classname);
                    }
                }

                Object.keys(propValuesMap).forEach(function(prop){
                    let value = propValuesMap[prop];
                    let targetRelated = targetEl.attr(prop);
                    if ( typeof targetRelated != "undefined" ) {
                        targetEl.text(value);
                        targetEl.removeAttr(prop);
                    }
                });
            });

            // remove title in default
            this.removeAttribute("title");

            this.appendChild(nodeEl);
        }
    }
);

// Add body-small class if window less than 768px
if ($(this).width() < 769) {
    $('body').addClass('body-small')
} else {
    $('body').removeClass('body-small')
}

// MetsiMenu
$('#side-menu').metisMenu();

// Collapse ibox function
$(document.body).on('click', '.collapse-link', function(event){
    var ibox = $(this).closest('div.ibox');
    var button = $(this).find('i');
    var content = ibox.children('.ibox-content');
    content.slideToggle(200);
    button.toggleClass('fa-chevron-up').toggleClass('fa-chevron-down');
    ibox.toggleClass('').toggleClass('border-bottom');
    setTimeout(function () {
        ibox.resize();
        ibox.find('[id^=map-]').resize();
    }, 50);
});

// Close ibox function
$('.close-link').on('click', function () {
    var content = $(this).closest('div.ibox');
    content.remove();
});

// Fullscreen ibox function
$('.fullscreen-link').on('click', function () {
    var ibox = $(this).closest('div.ibox');
    var button = $(this).find('i');
    $('body').toggleClass('fullscreen-ibox-mode');
    button.toggleClass('fa-expand').toggleClass('fa-compress');
    ibox.toggleClass('fullscreen');
    setTimeout(function () {
        $(window).trigger('resize');
    }, 100);
});

// Close menu in canvas mode
$('.close-canvas-menu').on('click', function () {
    $("body").toggleClass("mini-navbar");
    SmoothlyMenu();
});

// Run menu of canvas
$('body.canvas-menu .sidebar-collapse').slimScroll({
    height: '100%',
    railOpacity: 0.9
});

// Open close right sidebar
$('.right-sidebar-toggle').on('click', function () {
    $('#right-sidebar').toggleClass('sidebar-open');
});

// Initialize slimscroll for right sidebar
$('.sidebar-container').slimScroll({
    height: '100%',
    railOpacity: 0.4,
    wheelStep: 10
});

// Open close small chat
$('.open-small-chat').on('click', function () {
    $(this).children().toggleClass('fa-comments').toggleClass('fa-remove');
    $('.small-chat-box').toggleClass('active');
});

// Initialize slimscroll for small chat
$('.small-chat-box .content').slimScroll({
    height: '234px',
    railOpacity: 0.4
});

// Small todo handler
$('.check-link').on('click', function () {
    var button = $(this).find('i');
    var label = $(this).next('span');
    button.toggleClass('fa-check-square').toggleClass('fa-square-o');
    label.toggleClass('todo-completed');
    return false;
});


// Minimalize menu
$('.navbar-minimalize').on('click', function () {
    $("body").toggleClass("mini-navbar");
    SmoothlyMenu();

});

// Tooltips demo
$('.tooltip-demo').tooltip({
    selector: "[data-toggle=tooltip]",
    container: "body"
});


// Full height of sidebar
function fix_height() {
    var heightWithoutNavbar = $("body > #wrapper").height() - 61;
    $(".sidebar-panel").css("min-height", heightWithoutNavbar + "px");

    var navbarHeigh = $('nav.navbar-default').height();
    var wrapperHeigh = $('#page-wrapper').height();

    if (navbarHeigh > wrapperHeigh) {
        $('#page-wrapper').css("min-height", navbarHeigh + "px");
    }

    if (navbarHeigh < wrapperHeigh) {
        $('#page-wrapper').css("min-height", $(window).height() + "px");
    }

    if ($('body').hasClass('fixed-nav')) {
        if (navbarHeigh > wrapperHeigh) {
            $('#page-wrapper').css("min-height", navbarHeigh - 60 + "px");
        } else {
            $('#page-wrapper').css("min-height", $(window).height() - 60 + "px");
        }
    }

}

fix_height();

// Fixed Sidebar
$(window).bind("load", function () {
    if ($("body").hasClass('fixed-sidebar')) {
        $('.sidebar-collapse').slimScroll({
            height: '100%',
            railOpacity: 0.9
        });
    }
});

// Move right sidebar top after scroll
$(window).scroll(function () {
    if ($(window).scrollTop() > 0 && !$('body').hasClass('fixed-nav')) {
        $('#right-sidebar').addClass('sidebar-top');
    } else {
        $('#right-sidebar').removeClass('sidebar-top');
    }
});

$(window).bind("load resize scroll", function () {
    if (!$("body").hasClass('body-small')) {
        fix_height();
    }
});

$("[data-toggle=popover]")
    .popover();

// Add slimscroll to element
$('.full-height-scroll').slimscroll({
    height: '100%'
});

// Minimalize menu when screen is less than 768px
$(window).bind("resize", function () {
    if ($(this).width() < 769) {
        $('body').addClass('body-small')
    } else {
        $('body').removeClass('body-small')
    }
});

// Local Storage functions
// Set proper body class and plugins based on user configuration

if (localStorageSupport()) {

    var collapse = localStorage.getItem("collapse_menu");
    var fixedsidebar = localStorage.getItem("fixedsidebar");
    var fixednavbar = localStorage.getItem("fixednavbar");
    var boxedlayout = localStorage.getItem("boxedlayout");
    var fixedfooter = localStorage.getItem("fixedfooter");

    var body = $('body');

    if (fixedsidebar == 'on') {
        body.addClass('fixed-sidebar');
        $('.sidebar-collapse').slimScroll({
            height: '100%',
            railOpacity: 0.9
        });
    }

    if (collapse == 'on') {
        if (body.hasClass('fixed-sidebar')) {
            if (!body.hasClass('body-small')) {
                body.addClass('mini-navbar');
            }
        } else {
            if (!body.hasClass('body-small')) {
                body.addClass('mini-navbar');
            }

        }
    }

    if (fixednavbar == 'on') {
        $(".navbar-static-top").removeClass('navbar-static-top').addClass('navbar-fixed-top');
        body.addClass('fixed-nav');
    }

    if (boxedlayout == 'on') {
        body.addClass('boxed-layout');
    }

    if (fixedfooter == 'on') {
        $(".footer").addClass('fixed');
    }
}

// check if browser support HTML5 local storage
function localStorageSupport() {
    return (('localStorage' in window) && window['localStorage'] !== null)
}

// For demo purpose - animation css script
function animationHover(element, animation) {
    element = $(element);
    element.hover(
        function () {
            element.addClass('animated ' + animation);
        },
        function () {
            //wait for animation to finish before removing classes
            window.setTimeout(function () {
                element.removeClass('animated ' + animation);
            }, 2000);
        });
}

function SmoothlyMenu() {
    if (!$('body').hasClass('mini-navbar') || $('body').hasClass('body-small')) {
        // Hide menu in order to smoothly turn on when maximize menu
        $('#side-menu').hide();
        // For smoothly turn on menu
        setTimeout(
            function () {
                $('#side-menu').fadeIn(400);
            }, 200);
    } else if ($('body').hasClass('fixed-sidebar')) {
        $('#side-menu').hide();
        setTimeout(
            function () {
                $('#side-menu').fadeIn(400);
            }, 100);
    } else {
        // Remove all inline style from jquery fadeIn function to reset menu state
        $('#side-menu').removeAttr('style');
    }
}

// Dragable panels
function WinMove() {
    var element = "[class*=col]";
    var handle = ".ibox-title";
    var connect = "[class*=col]";
    $(element).sortable(
        {
            handle: handle,
            connectWith: connect,
            tolerance: 'pointer',
            forcePlaceholderSize: true,
            opacity: 0.8
        })
        .disableSelection();
}

function encodeParamPairs(param){
    return Object.keys(param)
        .map(function(key){ return key + "=" + encodeURIComponent(param[key]); })
        .join('&');
}

function loadDeviceData({ deviceName, dateFrom, dateTo, date }) {
    date = date || new Date();
    
    if ( !deviceName || !deviceName.length ) return console.error("DeviceChart: deviceName is missing.");

    let startDate = dateFrom ? moment(dateFrom) : moment(date).startOf('day');
    let endDate = dateTo ? moment(dateTo) : moment(date).endOf('day');

    let params = {
        end: endDate.toISOString(),
        start: startDate.toISOString()
    };

    let names = Array.isArray(deviceName) ? deviceName.slice(0) : [deviceName];

    let promises = names.map(function(dname){
        let url = "/api/cells/" + dname + "?" + encodeParamPairs(params);
        return Promise.resolve($.getJSON(url))
            .then(function(res){
                res.forEach(function(item){
                    item["Time_localstamp"] = moment(item["Time_convert"]).toDate().getTime();
                });
                return res;
            });
    });

    return Promise.all(promises);
}

const userLang = navigator.language || navigator.userLanguage; 
const langCode = userLang.substr(0, 2);
const i18nMapping = {
    zh: {
        "Cancel": "取消",
        "Apply": "確認",
        "Custom Range": "自訂日期範圍",
        "Nearly 3 Days": "最近 3 天",
        "Nearly 7 Days": "最近 7 天",
        "Nearly 30 Days": "最近 30 天",
        "Su": "日",
        "Mo": "一",
        "Tu": "二",
        "We": "三",
        "Th": "四",
        "Fr": "五",
        "Sa": "六",
        "Jan": "1月",
        "Feb": "2月",
        "Mar": "3月",
        "Apr": "4月",
        "May": "5月",
        "Jun": "6月",
        "Jul": "7月",
        "Aug": "8月",
        "Sep": "9月",
        "Oct": "10月",
        "Nov": "11月",
        "Dec": "12月"
    }
}

const _t = word => {
    if ( i18nMapping[langCode] ) {
        word = i18nMapping[langCode][word] || word;
    }
    return word;
};


const initDateRange = [moment().subtract(3, 'days'), moment()];
const constDateRanges = {};

constDateRanges[ _t('Nearly 3 Days') ] = initDateRange;
constDateRanges[ _t('Nearly 7 Days') ] = [moment().subtract(7, 'days'), moment()];
constDateRanges[ _t('Nearly 30 Days') ] = [moment().subtract(30, 'days'), moment()];

const datePickerLocale = {
    format: 'YYYY-MM-DD HH:mm:ss',
    cancelLabel: _t('Cancel'),
    applyLabel: _t('Apply'),
    customRangeLabel: _t('Custom Range'),
    daysOfWeek: [
        _t("Su"),
        _t("Mo"),
        _t("Tu"),
        _t("We"),
        _t("Th"),
        _t("Fr"),
        _t("Sa")
    ],
    monthNames: [
        _t("Jan"),
        _t("Feb"),
        _t("Mar"),
        _t("Apr"),
        _t("May"),
        _t("Jun"),
        _t("Jul"),
        _t("Aug"),
        _t("Sep"),
        _t("Oct"),
        _t("Nov"),
        _t("Dec")
    ]
};

