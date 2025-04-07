// Webscraper

type Product = {
    url?: string
    category: string
    name?: string
    description?: string
    iconsURL?: string
    images?: string[]
    downloads?: string[]
    models: Record<string, any>
}

import { writeToPath } from '@fast-csv/format'
const converter = require('json-2-csv')
const cheerio = require('cheerio');

const products: Product[] = [];

const ignoreUrls = ['https://pando.es/en/placa-de-gas-90-ref-pga-4491-touch-control/'];

(async () => {
    const urls = ['https://pando.es/en/wall-hoods/',
        'https://pando.es/en/island-hoods/',
        'https://pando.es/en/ceiling-hoods/',
        'https://pando.es/en/ovens/',
        'https://pando.es/en/induction-hobs/',
        'https://pando.es/en/refrigerators-pando/',
        'https://pando.es/en/dishwashers-pando/',
        'https://pando.es/en/wine-coolers/',
        'https://pando.es/en/pando-beverage-cooler/',
    ];

    urls.forEach(async (url) => {

        const response = await fetch(url);

        const $ = cheerio.load(await response.text());

        // Get product carousel items
        await $('.uael-post__title').each(async (_: number, elem: any) => {
            let carouselImages: string[] = []

            let productUrl = $(elem).find('a').first().attr('href');
            let productName = $(elem).find('a').first().text().trim();

            if (ignoreUrls.includes(productUrl)) return;

            const product: Product = {
                url: productUrl,
                category: url.split('/')[4],
                name: productName,
                description: undefined,
                iconsURL: undefined,
                images: [],
                downloads: [],
                models: [],
            }

            const productPage: Promise = await fetch(product.url)
            const $2 = cheerio.load(await productPage.text())

            product.description = $2('.av-subheading').text().replace(/\n/gm, ' ').trim()
            product.iconsURL = $2('.avia-image-overlay-wrap').find('img').first().attr('src');
            $2('.avia-gallery-thumb a img').each((i, elem) => {
                if (!$2(elem).attr('srcset')) { return }
                carouselImages.push($2(elem).first().attr('srcset').split(',')[0]);
            })
            // dedupe images
            product.images = [...new Set(carouselImages)];

            $2('.av_one_third .avia_textblock').last().find('a').each((_, elem) => {
                let downloadUrl = prependRootUrl($2(elem).attr('href'))
                let download = {
                    name: $2(elem).text(),
                    url: downloadUrl
                }
                product.downloads.push(download)
            });

            let tableHeaders = [];
            $2('.tablepress > tbody > tr').each((_, elem) => {
                if (_ === 0) {
                    const ths = $(elem).find("td")
                    $(ths).each((_, elem) => {
                        tableHeaders.push($(elem).text().toLowerCase());
                    })
                    return
                }
                const tds = $(elem).find("td")
                const tableRow = {}
                $(tds).each((i, elem) => {
                    //get model page url
                    if (i === 0) {
                        tableRow[tableHeaders[i]] = $(elem).text()
                        tableRow["refUrl"] = prependRootUrl($(elem).find('a').attr('href'))
                        return
                    }
                    tableRow[tableHeaders[i]] = $(elem).text()
                });
                product.models.push(tableRow)
            })
            products.push(product)

            Bun.write('products.csv', converter.json2csv(products))

            console.log(products.length)

        })
    })
})();

// prepend the root url when missing, otherwise return the url passed in
const prependRootUrl = (url: string) => {
    if (!/^https:\/\/pando.es\//g.test(url)) { url = `https://pando.es` + url }
    return url
}
