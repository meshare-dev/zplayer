/**
 * Full list of supportedMediaCommands:
 * https://developers.google.com/cast/docs/reference/messages#MediaStatus
 */
const SUPPORTED_MEDIA_COMMANDS = cast.framework.messages.Command.STREAM_VOLUME |
  cast.framework.messages.Command.STREAM_MUTE |
  cast.framework.messages.Command.PAUSE;
//  cast.framework.messages.Command.SEEK
//  cast.framework.messages.Command.QUEUE_SHUFFLE
//  cast.framework.messages.Command.QUEUE_NEXT
//  cast.framework.messages.Command.QUEUE_PREV

/**
 * Cast receiver context object
 */
const castContext_ = cast.framework.CastReceiverContext.getInstance();

/**
 * Player manager object
 */
const playerManager_ = castContext_.getPlayerManager();

/**
 * Enable debug log from Google Cast SDK
 */
// castContext_.setLoggerLevel(cast.framework.LoggerLevel.DEBUG);

/**
 * Log events for analytics
 */
const analytics_ = new CastAnalytics();
analytics_.start();
const playbackConfig = new cast.framework.PlaybackConfig();
playbackConfig.autoResumeNumberOfSegments = 1;
playbackConfig.autoPauseDuration = 1;
playbackConfig.autoResumeDuration = 1;
castContext_.start({
  'supportedCommands': SUPPORTED_MEDIA_COMMANDS
});
castContext_.loadPlayerLibraries(true);

/**
 * Make async requests to fetch contentUrl.
 * @param {string} requestUrl
 * @param {string} credential
 * @param {cast.framework.messages.LoadRequestData} request
 * @returns {cast.framework.messages.LoadRequestData}
 */
function fetchAssetAndAuth(requestUrl, credential, request) {
  return new Promise(function(resolve, reject) {
    const tokens = requestUrl.split('?');
    const streamUrl = tokens[0];
    // console.log('streamUrl: ' + streamUrl);
    // console.log('cameraId: ' + cameraId);
    // console.log('credential: ' + credential);

    request.media.contentUrl = streamUrl;
    if (streamUrl.endsWith('m3u8')) {
      request.media.contentType = 'application/x-mpegURL';
    } else if (streamUrl.endsWith('mpd')) {
      request.media.contentType = 'application/dash+xml';
    } else if (streamUrl.endsWith('mp4')) {
      request.media.contentType = 'video/mp4';
    } else {
      console.log('Unknown contentType for ' + streamUrl);
    }

    // Set metadata title for both in Google Home App and CAF Receiver UI.
    // https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.messages.GenericMediaMetadata
    var metadata = new cast.framework.messages.GenericMediaMetadata();
    metadata.title = 'Camera';
    request.media.metadata = metadata;
    request.media.contentUrl = request.media.entity;
    resolve(request);
  });
};

/**
 * Load message interceptor
 */
playerManager_.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  loadRequestData => {
    // Requests from web-senders.
    if (!loadRequestData.media ||
        !loadRequestData.media.entity) {
      return loadRequestData;
    }
    // Requests from Google Assistant.
    return fetchAssetAndAuth(
      loadRequestData.media.entity, loadRequestData.credentials,
      loadRequestData)
      .then((modifiedRequest) => { // verified users 
        return new Promise(function(resolve, reject) {
          setTimeout(() => resolve(modifiedRequest), 7000);
        });
      }).then((modifiedRequest) => {
        return modifiedRequest;
      }).catch(() => {  // invalid users
        return {
          type: cast.framework.messages.ErrorType.LOAD_FAILED,
          reason: cast.framework.messages.ErrorReason.AUTHENTICATION_EXPIRED
        }
      });
  }
);
