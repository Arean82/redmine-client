const 	Handlebars	= require('handlebars')
		moment		= require('moment')
		shell   = require('electron').shell
		RedmineIssues		= require('./assets/js/RedmineIssues')
;

/* Time Updates */
// var time = new TimeUpdate();
/* /Time Updates */


var user_id = null;
var limit = 100;


Handlebars.registerHelper('nicetime', function(time) {
  return moment(time, '').fromNow();
});

// Whenever the app starts
$(function() {
	var App = new RedmineIssues();
	App.init();
});
