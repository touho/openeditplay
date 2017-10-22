export function getAjax(url) {
	return new Promise(function(resolve, reject) {
		let xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4) {
				if (this.status === 200)
					resolve(JSON.parse(this.responseText));
				else
					reject();
			}
		};
		xhttp.open("GET", url, true);
		xhttp.send();
	});
}

export function standaloneMobileLinkClickEventSupport(e) {
	if (window.navigator.standalone) {
		e.preventDefault();
		let url = e.target.getAttribute('href');
		window.location.href = url;
	}
}

// 2016-01-01 -> 3 years ago
export function dateToAgoFormat(date) {
	date = new Date(date);
	
	let now = new Date();
	let diffSeconds = (now - date) / 1000;
	if (diffSeconds < 10) {
		return 'now';
	} else if (diffSeconds < 60) {
		return 'less than minute ago';
	}
	
	let diffMinutes = diffSeconds / 60;
	
	if (diffMinutes < 2) {
		return 'minute ago';
	} else if (diffMinutes < 60) {
		return `${diffMinutes | 0} minutes ago`;
	}

	let diffHours = diffMinutes / 60;

	if (diffHours < 2) {
		return 'hour ago';
	} else if (diffHours < 24) {
		return `${diffHours | 0} hours ago`;
	}

	let diffDays = diffHours / 60;

	if (diffDays < 2) {
		return 'day ago';
	} else if (diffDays < 7) {
		return `${diffDays | 0} days ago`;
	}
	
	let diffWeeks = diffDays / 7;
	
	if (diffWeeks < 2) {
		return 'week ago';
	} else if (diffWeeks < 4) {
		return `${diffDays | 0} weeks ago`;
	}

	let diffMonths = diffDays / 30;

	if (diffMonths < 2) {
		return 'month ago';
	} else if (diffMonths < 12) {
		return `${diffMonths | 0} months ago`;
	}

	let diffYears = diffDays / 365;

	if (diffYears < 2) {
		return 'year ago';
	} else {
		return `${diffYears | 0} years ago`;
	}
}
