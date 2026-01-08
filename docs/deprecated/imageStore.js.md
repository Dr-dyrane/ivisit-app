# imageStore.js (Deprecated)

> **Original Location:** `store/imageStore.js`  
> **Replaced By:** `services/imageService.js`  
> **Backup Date:** 2026-01-08

---

## Overview

This was the original image storage handler that managed image URIs in AsyncStorage.

### Issues with this approach:
1. Directly calls `AsyncStorage` instead of using database abstraction
2. Uses dynamic unprefixed keys (`image_${timestamp}`)
3. No cleanup mechanism for orphaned images
4. No integration with database layer

---

## Original Code

```javascript
// store/imageStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const imageStore = {
    // Function to store image and return a unique key
    uploadImage: async (imageUri) => {
        try {
            const imageKey = `image_${Date.now()}`; // Generate unique key using timestamp
            await AsyncStorage.setItem(imageKey, imageUri); // Store image URI with key
            return imageKey;
        } catch (error) {
            console.error("Image upload error:", error.message);
            throw error;
        }
    },

    // Function to retrieve image by key
    getImage: async (imageKey) => {
        try {
            const imageUri = await AsyncStorage.getItem(imageKey);
            if (imageUri) {
                return imageUri;
            } else {
                throw new Error("Image not found");
            }
        } catch (error) {
            console.error("Get image error:", error.message);
            throw error;
        }
    },
};

export default imageStore;
```

---

## Key Methods Summary

| Method | Purpose | Returns |
|--------|---------|---------|
| `uploadImage(imageUri)` | Store an image URI | `imageKey` string |
| `getImage(imageKey)` | Retrieve image URI by key | `imageUri` string |

---

## Storage Keys Used

| Key Pattern | Purpose |
|-------------|---------|
| `image_${timestamp}` | Dynamic key for each stored image |

**Problem:** These keys are not tracked anywhere, making it impossible to:
- List all stored images
- Clean up unused images
- Migrate images properly

---

## Migration Notes

When creating `imageService.js`, consider:

1. **Use prefixed keys:** `@ivisit_images` for an image registry
2. **Track all image keys:** Store a list of all image keys for cleanup
3. **Add delete functionality:** Allow removing images
4. **Add list functionality:** Allow listing all stored images

### Suggested New Structure

```javascript
// services/imageService.js
import { database, StorageKeys } from '../database/db';

const IMAGE_PREFIX = '@ivisit_image_';

export const imageService = {
  upload: async (imageUri) => {
    const imageKey = `${IMAGE_PREFIX}${Date.now()}`;
    // Store the image
    // Also track in a registry for cleanup
  },
  
  get: async (imageKey) => { ... },
  
  delete: async (imageKey) => { ... },
  
  listAll: async () => { ... },
  
  cleanup: async () => {
    // Remove orphaned images not linked to any user
  },
};
```

---

## Usage in Codebase

The `imageStore` was used for:
1. Profile picture uploads during registration
2. Profile picture updates in settings

Search for usages:
```bash
grep -r "imageStore" --include="*.js" --include="*.jsx"
```

