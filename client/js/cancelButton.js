var callback = null;

Template.cancelButton.events({
	"click .cancel.button" : function(e) {
		this.callback();
	},
});

Template.cancelButton.onCreated(function() {
	callback = this.data.callback;
	document.addEventListener("keyup", escKeyListener);
});

Template.cancelButton.onDestroyed(function() {
	document.removeEventListener("keyup", escKeyListener);
});

function escKeyListener(e) {
	if (e.key == "Escape") {
		callback();
	}
}
