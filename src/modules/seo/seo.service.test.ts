import { describe, expect, it } from 'vitest';
import { canonicalLocationSlug } from './seo.entity';
import { locationQueryFromSlug } from './seo.service';

describe('SEO location routing', () => {
  it('creates stable lowercase location slugs', () => {
    expect(canonicalLocationSlug('New Chandigarh')).toBe('new-chandigarh');
    expect(canonicalLocationSlug('  Mohali  ')).toBe('mohali');
  });

  it('parses supported canonical combinations', () => {
    expect(locationQueryFromSlug('properties-for-sale-in-mohali')).toEqual({ city: 'Mohali', filters: { city: 'Mohali', listingType: 'SALE' } });
    expect(locationQueryFromSlug('2-bhk-flats-in-zirakpur')).toEqual({ city: 'Zirakpur', filters: { city: 'Zirakpur', minBedrooms: 2 } });
    expect(locationQueryFromSlug('commercial-property-in-nowhere')).toBeNull();
  });
});
