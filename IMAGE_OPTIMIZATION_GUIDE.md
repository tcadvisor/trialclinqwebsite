# Image Optimization Guide

This document describes the image optimization improvements made to the TrialCliniq website.

## Summary of Changes

All images across the website have been optimized with the following improvements:

1. **Added `loading` attributes** - Images use `lazy` loading for below-the-fold content and `eager` for above-the-fold (logos)
2. **Added `width` and `height` attributes** - Prevents layout shift during page load
3. **Added `decoding="async"` attribute** - Allows browser to decode images asynchronously
4. **Replaced external CDN URLs with local assets** - Logo images now served from `/public/images/`
5. **Created reusable OptimizedImage component** - For future use with advanced features

## Files Modified

### 1. Core Components

#### `/src/components/ui/optimized-image.tsx` (NEW)
A reusable React component that provides:
- Automatic lazy loading
- Error handling with fallback images
- Optional blur placeholder during loading
- Proper width/height management

**Usage Example:**
```tsx
import { OptimizedImage } from '../components/ui/optimized-image';

<OptimizedImage
  src="/images/hero.jpg"
  alt="Hero image"
  width={800}
  height={600}
  loading="lazy"
  showBlurPlaceholder={true}
/>
```

### 2. Header Components

All header components now use optimized logo images:

- `/src/components/HomeHeader.tsx` - Line 28-36
- `/src/components/PatientHeader.tsx` - Line 31-39
- `/src/components/SiteHeader.tsx` - Line 23-31

**Changes:**
- Replaced `https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png`
- With `/images/trialcliniq-logo.png`
- Added `width="124"`, `height="39"`, `loading="eager"`

### 3. Main Pages

#### `/src/routes/LandingPage.tsx`
- **Line 147-156**: Header logo - eager loading
- **Line 228-239**: Hero image - eager loading with dimensions
- **Line 269-278**: About section image - lazy loading with dimensions

#### `/src/routes/TeamPage.tsx`
- **Line 42-50**: Header logo - eager loading

#### `/src/routes/ContactPage.tsx`
- **Line 70-78**: Header logo - eager loading

### 4. Search & Trial Pages

#### `/src/screens/SearchResults.tsx`
- **Line 805-818**: Footer logo and social icons - lazy loading

#### `/src/screens/TrialDetails.tsx`
- **Line 47-54**: Header logo - eager loading

### 5. Patient Screens

#### `/src/screens/patients/Settings.tsx`
- **Line 13-20**: Header logo - eager loading

#### `/src/screens/patients/Consent.tsx`
- **Line 89-97**: Footer logo - lazy loading

### 6. Home2 Route

#### `/src/routes/Home2/screens/Home.tsx`
- **Line 139-153**: Three healthcare images in grid - lazy loading
- **Line 178-186**: Laboratory image - lazy loading
- **Line 368-376**: Footer logo - lazy loading

## Local Assets

Downloaded and stored in `/public/images/`:

1. `trialcliniq-logo.png` - Main logo (124x39px)
2. `trialcliniq-logo-footer.png` - Footer logo variant (124x39px)
3. `socials.svg` - Social media icons (120x24px)

## Image Loading Strategy

### Eager Loading (Above the Fold)
Used for:
- All header logos
- Hero images
- Critical above-the-fold content

```tsx
<img
  src="/images/logo.png"
  alt="Logo"
  width="124"
  height="39"
  loading="eager"
/>
```

### Lazy Loading (Below the Fold)
Used for:
- Footer images
- Content images in lower sections
- Grid images
- Non-critical decorative images

```tsx
<img
  src="/images/content.jpg"
  alt="Content"
  width="800"
  height="600"
  loading="lazy"
  decoding="async"
/>
```

## Performance Benefits

1. **Reduced Initial Page Load**: Lazy loading defers non-critical images
2. **No Layout Shift**: Width/height attributes prevent CLS (Cumulative Layout Shift)
3. **Faster Rendering**: Async decoding doesn't block main thread
4. **Better Caching**: Local assets can be cached by browser
5. **Improved LCP**: Eager loading ensures critical images load quickly

## Best Practices for Future Images

When adding new images to the site:

1. **Determine priority**: Is it above or below the fold?
   - Above: Use `loading="eager"` or omit the attribute
   - Below: Use `loading="lazy"`

2. **Always specify dimensions**: Add `width` and `height` attributes
   ```tsx
   width="800"
   height="600"
   ```

3. **Use async decoding for non-critical images**:
   ```tsx
   decoding="async"
   ```

4. **Consider using the OptimizedImage component**:
   ```tsx
   <OptimizedImage
     src="/images/new-image.jpg"
     alt="Description"
     width={800}
     height={600}
     loading="lazy"
     showBlurPlaceholder={true}
     fallbackSrc="/images/placeholder.png"
   />
   ```

5. **Use responsive images with srcset** (future enhancement):
   ```tsx
   <img
     src="/images/hero-800.jpg"
     srcSet="/images/hero-400.jpg 400w,
             /images/hero-800.jpg 800w,
             /images/hero-1200.jpg 1200w"
     sizes="(max-width: 600px) 400px,
            (max-width: 1200px) 800px,
            1200px"
     alt="Hero"
     width="1200"
     height="600"
     loading="eager"
   />
   ```

## External CDN Images

Some images are still served from external CDNs:
- `cdn.builder.io` images in LandingPage.tsx and Home2/Home.tsx

These are optimized with:
- Width and height attributes
- Lazy loading (for below-the-fold)
- Async decoding
- WebP format already in URLs

**Future Recommendation**: Download and optimize these images locally if they don't change frequently.

## Testing

To verify the optimization:

1. **Check loading attribute**:
   - Open DevTools → Network tab
   - Scroll down the page
   - Images should load only when they enter the viewport

2. **Check for layout shift**:
   - Open DevTools → Performance tab
   - Reload page and check CLS metric
   - Should be < 0.1 for good user experience

3. **Check async decoding**:
   - Images should not block main thread rendering
   - Page should be interactive while images load

## Maintenance

- Keep local images in `/public/images/` directory
- Use consistent naming conventions
- Optimize images before uploading (compress, resize)
- Consider implementing image CDN for dynamic resizing
- Monitor performance metrics regularly

## Next Steps (Future Enhancements)

1. **Implement srcset for responsive images**: Serve different sizes based on device
2. **Add blur placeholders**: Show low-quality placeholder while loading
3. **Implement image CDN**: Use services like Cloudinary or ImageKit
4. **Add AVIF format support**: Better compression than WebP
5. **Lazy load background images**: Optimize CSS background images
6. **Implement IntersectionObserver polyfill**: For older browser support
