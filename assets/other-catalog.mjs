import {otherAstryxWorks} from '../gallery/astryx/other.mjs';
import {otherFluentWorks} from '../gallery/fluent-ui/other.mjs';

export const otherWorks = [...otherFluentWorks, ...otherAstryxWorks]
  .map(item => ({...item, category: 'other'}));
