// src/middleware/platformNormalizer.middleware.js

/**
 * Normalizes platform-specific data into canonical event format
 * Maps platform-specific fields to our unified schema
 */

// Twitter/X normalization
const normalizeTwitterEvent = (rawData) => {
  const { tweet, engagement_type, user } = rawData;
  
  const eventTypeMap = {
    "like": "engagement",
    "retweet": "share",
    "reply": "comment",
    "bookmark": "save",
    "follow": "follow",
    "impression": "impression"
  };
  
  return {
    type: eventTypeMap[engagement_type] || "engagement",
    platform: "twitter",
    actor: {
      platform_user_id: user.id_str || user.id,
      username: user.screen_name || user.username,
      display_name: user.name,
      avatar_url: user.profile_image_url_https
    },
    subject: {
      content_id: tweet.id_str || tweet.id,
      content_type: "post",
      owner_platform_id: tweet.author_id || tweet.user.id_str
    },
    metrics: {
      count: 1
    },
    metadata: {
      source: rawData.source || "api",
      raw_event_id: tweet.id_str
    },
    timestamp: new Date(tweet.created_at || Date.now()).toISOString()
  };
};

// Instagram normalization
const normalizeInstagramEvent = (rawData) => {
  const { media, engagement_type, user } = rawData;
  
  const eventTypeMap = {
    "like": "engagement",
    "comment": "comment",
    "save": "save",
    "share": "share",
    "follow": "follow",
    "impression": "impression"
  };
  
  const contentTypeMap = {
    "IMAGE": "post",
    "VIDEO": "video",
    "CAROUSEL_ALBUM": "post",
    "REELS": "reel",
    "STORY": "story"
  };
  
  return {
    type: eventTypeMap[engagement_type] || "engagement",
    platform: "instagram",
    actor: {
      platform_user_id: user.id,
      username: user.username,
      display_name: user.full_name,
      avatar_url: user.profile_picture
    },
    subject: {
      content_id: media.id,
      content_type: contentTypeMap[media.media_type] || "post",
      owner_platform_id: media.owner.id
    },
    metrics: {
      count: 1
    },
    metadata: {
      source: rawData.source || "api",
      raw_event_id: media.id,
      is_verified: user.is_verified
    },
    timestamp: new Date(media.timestamp || Date.now()).toISOString()
  };
};

// YouTube normalization
const normalizeYouTubeEvent = (rawData) => {
  const { video, engagement_type, user } = rawData;
  
  const eventTypeMap = {
    "like": "engagement",
    "comment": "comment",
    "share": "share",
    "subscribe": "follow",
    "view": "impression"
  };
  
  return {
    type: eventTypeMap[engagement_type] || "engagement",
    platform: "youtube",
    actor: {
      platform_user_id: user.id,
      username: user.username || user.channelTitle,
      display_name: user.channelTitle,
      avatar_url: user.thumbnails?.default?.url
    },
    subject: {
      content_id: video.id,
      content_type: video.duration > 60 ? "video" : "short",
      owner_platform_id: video.channelId
    },
    metrics: {
      count: 1,
      duration_ms: video.duration ? video.duration * 1000 : null
    },
    metadata: {
      source: rawData.source || "api",
      raw_event_id: video.id
    },
    timestamp: new Date(video.publishedAt || Date.now()).toISOString()
  };
};

// TikTok normalization
const normalizeTikTokEvent = (rawData) => {
  const { video, engagement_type, user } = rawData;
  
  const eventTypeMap = {
    "like": "engagement",
    "comment": "comment",
    "share": "share",
    "follow": "follow",
    "view": "impression"
  };
  
  return {
    type: eventTypeMap[engagement_type] || "engagement",
    platform: "tiktok",
    actor: {
      platform_user_id: user.id || user.open_id,
      username: user.username || user.unique_id,
      display_name: user.nickname || user.display_name,
      avatar_url: user.avatar_url || user.avatar_larger
    },
    subject: {
      content_id: video.id,
      content_type: "video",
      owner_platform_id: video.author_id || video.author.id
    },
    metrics: {
      count: 1,
      duration_ms: video.duration ? video.duration * 1000 : null
    },
    metadata: {
      source: rawData.source || "api",
      raw_event_id: video.id
    },
    timestamp: new Date(video.create_time * 1000 || Date.now()).toISOString()
  };
};

// Facebook normalization
const normalizeFacebookEvent = (rawData) => {
  const { post, engagement_type, user } = rawData;
  
  const eventTypeMap = {
    "like": "engagement",
    "comment": "comment",
    "share": "share",
    "follow": "follow",
    "impression": "impression"
  };
  
  return {
    type: eventTypeMap[engagement_type] || "engagement",
    platform: "facebook",
    actor: {
      platform_user_id: user.id,
      username: user.username || user.name,
      display_name: user.name,
      avatar_url: user.picture?.data?.url
    },
    subject: {
      content_id: post.id,
      content_type: "post",
      owner_platform_id: post.from?.id
    },
    metrics: {
      count: 1
    },
    metadata: {
      source: rawData.source || "api",
      raw_event_id: post.id
    },
    timestamp: new Date(post.created_time || Date.now()).toISOString()
  };
};

// Threads normalization
const normalizeThreadsEvent = (rawData) => {
  const { post, engagement_type, user } = rawData;
  
  const eventTypeMap = {
    "like": "engagement",
    "reply": "comment",
    "repost": "share",
    "follow": "follow",
    "impression": "impression"
  };
  
  return {
    type: eventTypeMap[engagement_type] || "engagement",
    platform: "threads",
    actor: {
      platform_user_id: user.id,
      username: user.username,
      display_name: user.name,
      avatar_url: user.profile_pic_url
    },
    subject: {
      content_id: post.id,
      content_type: "post",
      owner_platform_id: post.author_id
    },
    metrics: {
      count: 1
    },
    metadata: {
      source: rawData.source || "api",
      raw_event_id: post.id,
      is_verified: user.is_verified
    },
    timestamp: new Date(post.timestamp || Date.now()).toISOString()
  };
};

// Main normalization middleware
exports.normalizePlatformData = (req, res, next) => {
  try {
    const rawData = req.body;
    const platform = rawData.platform || req.params.platform;
    
    if (!platform) {
      return res.status(400).json({
        success: false,
        message: "Platform identifier is required"
      });
    }
    
    let normalizedEvent;
    
    switch (platform.toLowerCase()) {
      case "twitter":
        normalizedEvent = normalizeTwitterEvent(rawData);
        break;
      case "instagram":
        normalizedEvent = normalizeInstagramEvent(rawData);
        break;
      case "youtube":
        normalizedEvent = normalizeYouTubeEvent(rawData);
        break;
      case "tiktok":
        normalizedEvent = normalizeTikTokEvent(rawData);
        break;
      case "facebook":
        normalizedEvent = normalizeFacebookEvent(rawData);
        break;
      case "threads":
        normalizedEvent = normalizeThreadsEvent(rawData);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported platform: ${platform}`
        });
    }
    
    // Replace request body with normalized event
    req.body = normalizedEvent;
    
    next();
    
  } catch (error) {
    console.error("Normalization error:", error);
    res.status(400).json({
      success: false,
      message: "Failed to normalize platform data",
      error: error.message
    });
  }
};

// Export individual normalizers for testing/direct use
module.exports = {
  normalizePlatformData: exports.normalizePlatformData,
  normalizeTwitterEvent,
  normalizeInstagramEvent,
  normalizeYouTubeEvent,
  normalizeTikTokEvent,
  normalizeFacebookEvent,
  normalizeThreadsEvent
};