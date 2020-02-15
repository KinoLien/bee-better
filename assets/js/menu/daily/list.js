
var updateModal = $("#updateModal"),
    updateForm = updateModal.find("form"),
    updateTitleField = updateForm.find("input[name=title]"),
    updateContentField = updateForm.find("textarea[name=content]"),
    updateDeviceField = updateForm.find("input[name=device]"),
    updateLogField = updateForm.find("input[name=log]");

$(document.body).on('click', 'button.log-update', function(event){
    var selfjq = $(this),
        data = selfjq.data();
      
    updateDeviceField.val(data.cellId);
    updateLogField.val(data.logId);
    updateTitleField.val(data.logTitle);
    updateContentField.val(data.logContent);

    updateModal._curSource = selfjq;
});

$(document.body).on('click', '#updateModal button.save-changes', function(event){

    var dataArray = updateForm.serializeArray(),
        reqData = dataArray.reduce((total, cur) => {
            total[cur.name] = cur.value;
            return total;
        }, {});

    // ajax post
    Promise.resolve($.post("/api/dailylist/" + reqData.device + "/log/" + reqData.log, reqData))
        .then(() => {
            if ( updateModal._curSource ) {
                updateModal._curSource.data({
                    logTitle: reqData["title"],
                    logContent: reqData["content"]
                });
                var tuple = updateModal._curSource.parents("tr");
                tuple.children("td[log-title]").text(reqData["title"]);
                tuple.children("td[log-content]").text(reqData["content"]);
            }
            updateModal.modal('toggle');
        });
});
