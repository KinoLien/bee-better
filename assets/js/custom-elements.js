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
                    let mapkey, classname;
                    [mapkey, classname] = clsIfProp.split(":");
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

            this.appendChild(nodeEl);
        }
    }
);