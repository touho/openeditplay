function getAjax(url) {
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

function standaloneMobileLinkClickEventSupport(e) {
	if (window.navigator.standalone) {
		e.preventDefault();
		let url = e.target.getAttribute('href');
		window.location.href = url;
	}
}
