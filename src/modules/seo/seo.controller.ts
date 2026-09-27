import { Request, Response } from 'express';
import { NotFoundError } from '@common/errors/AppError';
import { SeoService } from './seo.service';

export class SeoController {
  constructor(private readonly service: SeoService) {}

  location = async (req: Request, res: Response): Promise<void> => {
    const page = await this.service.locationPage(req.params.slug);
    if (!page) throw new NotFoundError('SEO location page not found');
    res.json(page);
  };

  sitemap = async (req: Request, res: Response): Promise<void> => {
    const xml = await this.service.sitemap(process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get('host')}`);
    res.type('application/xml').send(xml);
  };

  robots = async (req: Request, res: Response): Promise<void> => {
    const base = process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /login\nDisallow: /register\nDisallow: /saved\nSitemap: ${base}/api/seo/sitemap.xml\n`);
  };
}
