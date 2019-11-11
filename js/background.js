const annotationsEndpoint = "https://invidio.us/api/v1/annotations/";

function fetchVideoAnnotations(videoId) {
	if (videoId.length !== 11) { throw new Error("Video ID must be exactly 11 characters long"); }
	const requestUrl = annotationsEndpoint + videoId;
	console.info(`Retrieving annotations for '${videoId}' from '${requestUrl}'`);

	return new Promise((resolve, reject) => {
		fetch(requestUrl)
		.then(response => response.text())
		.then(text => {
			if (text) { resolve(text); }
 			// the video was archived but had no annotations
			else { reject("annotations_unavailable"); }
		}).catch(reject);
	});
}

function descriptionHasAnnotations(tabId) {
	const messageType = "check_description_for_annotations";
	chrome.tabs.sendMessage(tabId, {type: messageType}, response => {
		return (response && response.foundAnnotations);
	});
}

function handleVideoUpdate(tabId, videoId) {
	chrome.tabs.sendMessage(tabId, {
		type: "remove_renderer_annotations"
	});

	if (!descriptionHasAnnotations(tabId)) {
		fetchVideoAnnotations(videoId).then(text => {
			console.info(`Received annotations for ${videoId} from server..`);
			chrome.tabs.sendMessage(tabId, {
				type: "annotations_received",
				xml: text
			});
		}).catch(e => {
			console.info(`Annotation data is unavailable for this video (${videoId})\n (${e})`);
			chrome.tabs.sendMessage(tabId, {
				type: "annotations_unavailable"
			});
		});
	}
	else {
		console.info(`Annotations found in description (${videoId})..`);
	}
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (changeInfo.status === "complete") {	
		chrome.tabs.sendMessage(tabId, {
	        message: "video_change"
		}, videoId => {
			if (videoId) {
				handleVideoUpdate(tabId, videoId);
			}
			void chrome.runtime.lastError;
		});
	}
});
