const 	Handlebars	= require('handlebars')
		moment		= require('moment')
		shell		= require('electron').shell
;


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


function RedmineIssues(options) {
	this.options	= options;
	this.filters	= new Filters();

	return this;
}


RedmineIssues.prototype.init = function() {
	var that = this;

	this.filters.reset();

	$.ajaxSetup({
		async: true,
		beforeSend: function() {
			//console.log('Before send');
		},
		complete: function() {
			//console.log('Completed');
		},
		error: function() {
			//console.log('Error');
		},
		headers: {
			'X-Redmine-API-Key': apikey
		}
	});

	$(document).on('click', 'a[href^="http"]', function(e) {
		e.preventDefault();
		shell.openExternal(this.href);
	});

	// Submitting filters form
	$('#filter_frm').submit(function(e) {
		e.preventDefault();
		e.stopPropagation();

		// Resetting current filters
		that.filters.reset();

		// For each select list
		// TODO : use the
		$('#filter_frm select').each(function() {
			el = $(this);

			if (el.val() != 0) {
				that.filters.setFilters(el.attr('data-filter'), el.val());
			}
			else {
				that.filters.unsetFilters(el.attr('data-filter'));
			}
		});

		that.getUserTickets();
	});

	/*$('form#quick-task-id-frm').submit(function(e) {
		e.preventDefault();
		e.stopPropagation();
	});*/

	// Changing tab
	$('.tickets-filter li a').click(function() {
		$('.tickets-filter li').removeClass('is-active');
		$(this).parent('li').addClass('is-active');

		that.filters
			.reset()
			.unsetFilters('assigned_to_id', 'author_id', 'watcher_id')
			.setFilters($(this).parent('li').attr('data-filter'), 'me');
		that.getUserTickets();
	});

	// Filters reset button clicked
	$('.filters-reset').click(function() {
		that.filters
			.reset();
		that.getUserTickets();
	});

	//get_current_user();
	that.getUserTickets();

};

RedmineIssues.prototype.getProjects = function(){
	$.get(host + '/projects.json', this.filters.getCurrent(), function(response, status) {
		for (i in response.projects) {
			if (response.projects[i].status == 5) {
				continue;
			}

			$('#projects_list').append('<option value="'+response.projects[i].id+'">'+response.projects[i].name.toUpperCase()+'</option>');
		}
	}, 'json');
};

RedmineIssues.prototype.getTrackers = function(){
	$.get(host + '/trackers.json', {
		limit: 1000,
		sort: 'name'
	}, function(response, status) {
		for (i in response.trackers) {
			$('#trackers_list').append('<option value="'+response.trackers[i].id+'">'+response.trackers[i].name+'</option>');
		}
	}, 'json');
};

RedmineIssues.prototype.get_statuses = function(){
	$.get(host + '/issue_statuses.json', {
		limit: 1000,
		sort: 'name'
	}, function(response, status) {
		for (i in response.issue_statuses) {
			$('#statuses_list').append('<option value="'+response.issue_statuses[i].id+'">'+response.issue_statuses[i].name+'</option>');
		}
	}, 'json');
};

RedmineIssues.prototype.getPriorities = function(){
	$.get(host + '/enumerations/issue_priorities.json', {
		limit: 1000,
		sort: 'name'
	}, function(response, status) {
		for (i in response.issue_priorities) {
			$('#priorities_list').append('<option value="'+response.issue_priorities[i].id+'">'+response.issue_priorities[i].name+'</option>');
		}
	}, 'json');
};

RedmineIssues.prototype.getUserTickets = function(){

	var that = this;

	var filters		= this.filters.getCurrent();
	var source		= $("#tickets-list").html();
	var template	= Handlebars.compile(source);

	$.get(host + '/issues.json', filters, function(response, status) {

		var selects = {
			project : {
				container	: '#projects_list',
				filter_id	: 'project_id',
				label		: 'Projects'
			},
			priority : {
				container	: '#priorities_list',
				filter_id	: 'priority_id',
				label		: 'Priorities'
			},
			status : {
				container	: '#statuses_list',
				filter_id	: 'status_id',
				label		: 'Statuses'
			},
			tracker : {
				container	: '#trackers_list',
				filter_id	: 'tracker_id',
				label		: 'Trackers'
			}
		}
		var select_cache = [];

		for (var select in selects) {
			$(selects[select].container).children('option').remove();
			var el = document.createElement('option');
			$(el)
				.attr('value', 0)
				.text('--- '+selects[select].label+' ---')
			;
			$(el).appendTo(selects[select]['container']);
		}

		for (var issue in response.issues) {
			var item = response.issues[issue];

			// Cleaning
			response.issues[issue].subject = response.issues[issue].subject.substring(0, 80);

			for (var select in selects) {
				if (! select_cache[select]) {
					select_cache[select] = [];
				}

				if (typeof select_cache[select][item[select].id] == 'undefined') {
					select_cache[select][item[select].id] = item[select].name;

					var el = document.createElement('option');
					$(el)
						.attr('value', item[select].id)
						.text(item[select].name)
					;
					$(el).appendTo(selects[select]['container']);

					if (that.filters.getFilter(selects[select]['filter_id']) == item[select].id) {
						$(el).attr('selected', 'selected');
					}
				}
			}
		}

		response.redmine_host = host;
		var html 	= template(response);
		$('.tickets .tickets-for-me').html(html);
	}, 'json');
};

RedmineIssues.prototype.getCurrentUser = function(){
	$.get(host + '/users/current.json', {}, function(response, status) {

		return response;

	}, 'json');
};


function Filters(options) {
	this.options	= options;
	this.dfilters	= {
		'status_id'			: 'open',
		'assigned_to_id'	: 'me',
		'sort'				: 'updated_on:desc',
		'limit'				: limit
	};
	this.cfilters	= {};
};

Filters.prototype.reset = function() {
	this.cfilters = this.dfilters;
	return this;
};

Filters.prototype.unsetFilters = function() {
	for (i = 0; i < arguments.length; ++i) {
		delete this.cfilters[arguments[i]];
	}
	return this;
};

Filters.prototype.setFilters = function(mixed, value) {
	var filters = {};

	if (arguments.length > 1) {
		filters[mixed] = value;
	}
	else {
		filters = mixed;
	}

	if (typeof filters == 'object') {
		for (i in filters) {
			this.cfilters[i] = filters[i];
		}
	}
	return this;
}

Filters.prototype.getFilter = function(name){
	if (typeof this.cfilters[name] != 'undefined') {
		return this.cfilters[name];
	}
	return false;
};

Filters.prototype.getCurrent = function(){
	return this.cfilters;
};