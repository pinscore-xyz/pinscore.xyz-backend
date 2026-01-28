// test-events.js - Sample test cases for event system
// Run with: node test-events.js

const axios = require("axios");

const BASE_URL = "http://localhost:5000/api/events";

// Sample valid events for each platform
const sampleEvents = {
  twitter: {
    type: "engagement",
    platform: "twitter",
    actor: {
      platform_user_id: "tw_12345",
      username: "johndoe",
      display_name: "John Doe",
      avatar_url: "https://example.com/avatar.jpg"
    },
    subject: {
      content_id: "tweet_67890",
      content_type: "post",
      owner_platform_id: "creator_11111"
    },
    metrics: {
      count: 1
    },
    metadata: {
      source: "api",
      is_verified: false
    },
    timestamp: new Date().toISOString()
  },

  instagram: {
    type: "engagement",
    platform: "instagram",
    actor: {
      platform_user_id: "ig_22222",
      username: "janedoe",
      display_name: "Jane Doe"
    },
    subject: {
      content_id: "post_33333",
      content_type: "reel",
      owner_platform_id: "creator_44444"
    },
    metrics: {
      count: 1
    },
    metadata: {
      source: "api",
      is_verified: true
    },
    timestamp: new Date().toISOString()
  },

  youtube: {
    type: "impression",
    platform: "youtube",
    actor: {
      platform_user_id: "yt_55555",
      username: "viewer123"
    },
    subject: {
      content_id: "video_66666",
      content_type: "video",
      owner_platform_id: "channel_77777"
    },
    metrics: {
      count: 1,
      duration_ms: 125000
    },
    metadata: {
      source: "api"
    },
    timestamp: new Date().toISOString()
  },

  follow: {
    type: "follow",
    platform: "instagram",
    actor: {
      platform_user_id: "ig_88888",
      username: "newfollower"
    },
    subject: {
      content_id: "profile_99999",
      content_type: "profile",
      owner_platform_id: "creator_00000"
    },
    metrics: {
      count: 1
    },
    metadata: {
      source: "api"
    },
    timestamp: new Date().toISOString()
  }
};

// Test functions
async function testSingleIngestion() {
  console.log("\n🧪 Testing single event ingestion...");
  
  try {
    const response = await axios.post(`${BASE_URL}/ingest`, sampleEvents.twitter);
    
    if (response.data.success) {
      console.log("✅ Single ingestion SUCCESS");
      console.log("   Event ID:", response.data.data.event_id);
      return response.data.data.event_id;
    }
  } catch (error) {
    console.log("❌ Single ingestion FAILED");
    console.log("   Error:", error.response?.data || error.message);
  }
}

async function testBatchIngestion() {
  console.log("\n🧪 Testing batch event ingestion...");
  
  const events = Object.values(sampleEvents);
  
  try {
    const response = await axios.post(`${BASE_URL}/ingest/batch`, { events });
    
    if (response.data.success) {
      console.log("✅ Batch ingestion SUCCESS");
      console.log("   Successful:", response.data.data.successful.length);
      console.log("   Failed:", response.data.data.failed.length);
    }
  } catch (error) {
    console.log("❌ Batch ingestion FAILED");
    console.log("   Error:", error.response?.data || error.message);
  }
}

async function testValidation() {
  console.log("\n🧪 Testing validation (invalid event)...");
  
  const invalidEvent = {
    type: "invalid_type", // Wrong enum
    platform: "twitter"
    // Missing required fields
  };
  
  try {
    await axios.post(`${BASE_URL}/ingest`, invalidEvent);
    console.log("❌ Validation FAILED - should have rejected invalid event");
  } catch (error) {
    if (error.response?.status === 400) {
      console.log("✅ Validation SUCCESS - correctly rejected");
      console.log("   Error:", error.response.data.message);
    } else {
      console.log("❌ Unexpected error");
    }
  }
}

async function testGetEventById(eventId) {
  console.log("\n🧪 Testing get event by ID...");
  
  if (!eventId) {
    console.log("⏭️  Skipping - no event ID available");
    return;
  }
  
  try {
    // Note: This requires authentication in production
    const response = await axios.get(`${BASE_URL}/${eventId}`);
    
    if (response.data.success) {
      console.log("✅ Get event SUCCESS");
      console.log("   Platform:", response.data.data.platform);
      console.log("   Type:", response.data.data.type);
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("⚠️  Authentication required (expected in production)");
    } else {
      console.log("❌ Get event FAILED");
      console.log("   Error:", error.response?.data || error.message);
    }
  }
}

async function testImmutability(eventId) {
  console.log("\n🧪 Testing event immutability...");
  
  if (!eventId) {
    console.log("⏭️  Skipping - no event ID available");
    return;
  }
  
  try {
    // Try to update (should fail)
    await axios.put(`${BASE_URL}/${eventId}`, {
      type: "different_type"
    });
    
    console.log("❌ Immutability FAILED - update should be rejected");
  } catch (error) {
    if (error.response?.data?.message?.includes("immutable")) {
      console.log("✅ Immutability SUCCESS - update rejected");
    } else if (error.response?.status === 404) {
      console.log("⚠️  Update endpoint not implemented (good - events are immutable)");
    } else {
      console.log("❌ Unexpected error");
    }
  }
}

async function testPlatformNormalization() {
  console.log("\n🧪 Testing platform normalization...");
  
  const rawInstagramData = {
    platform: "instagram",
    engagement_type: "like",
    user: {
      id: "ig_normalized",
      username: "test_normalizer",
      full_name: "Test Normalizer",
      profile_picture: "https://example.com/pic.jpg",
      is_verified: true
    },
    media: {
      id: "media_normalized",
      media_type: "REELS",
      timestamp: new Date().toISOString(),
      owner: {
        id: "owner_normalized"
      }
    },
    source: "api"
  };
  
  try {
    // Note: You need to create this endpoint or test via controller directly
    console.log("⚠️  Normalization test requires custom endpoint");
    console.log("   Sample input:", JSON.stringify(rawInstagramData, null, 2));
  } catch (error) {
    console.log("❌ Normalization test error:", error.message);
  }
}

async function testTimestampValidation() {
  console.log("\n🧪 Testing timestamp validation...");
  
  // Test future timestamp (should fail)
  const futureEvent = {
    ...sampleEvents.twitter,
    timestamp: new Date(Date.now() + 86400000).toISOString() // Tomorrow
  };
  
  try {
    await axios.post(`${BASE_URL}/ingest`, futureEvent);
    console.log("❌ Timestamp validation FAILED - accepted future timestamp");
  } catch (error) {
    if (error.response?.data?.message?.includes("future")) {
      console.log("✅ Timestamp validation SUCCESS - rejected future timestamp");
    } else {
      console.log("⚠️  Different error:", error.response?.data?.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting Pinscore Event System Tests");
  console.log("=====================================\n");
  
  let eventId = null;
  
  // Test 1: Single ingestion
  eventId = await testSingleIngestion();
  
  // Test 2: Batch ingestion
  await testBatchIngestion();
  
  // Test 3: Validation
  await testValidation();
  
  // Test 4: Get event by ID
  await testGetEventById(eventId);
  
  // Test 5: Immutability
  await testImmutability(eventId);
  
  // Test 6: Platform normalization
  await testPlatformNormalization();
  
  // Test 7: Timestamp validation
  await testTimestampValidation();
  
  console.log("\n=====================================");
  console.log("✅ Test suite complete!\n");
}

// Execute if run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testSingleIngestion,
  testBatchIngestion,
  testValidation,
  sampleEvents
};