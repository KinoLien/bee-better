
// /device/uniquecheck/cellid/
$("input[unique]").blur(function(){
	var $self = $(this);
	var $inputWrap = $self.parent();
	var inputEl = $self.get(0);
	var value = $self.val();
	$inputWrap.removeClass("has-success has-error");
	blockSubmit = true;
	$.get({
		url: ["uniquecheck", $self.attr("name"), value].join("/")
	})
	.done(function(res){
		blockSubmit = false;
		if (res == "fail") {
			$inputWrap.addClass("has-error");
			inputEl.setCustomValidity(value + " is already in use.");
		} else if (res == "ok") {
			$inputWrap.addClass("has-success");
			inputEl.setCustomValidity("");
		}
	});
});
