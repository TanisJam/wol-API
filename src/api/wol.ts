import express from 'express';
import axios from 'axios';
import { load } from 'cheerio';

const router = express.Router();

type WolResponse = {
  [key: string]: string
};

router.get<
{
  week: string;
},
WolResponse
>('/:week', async (req, res) => {
  const week = req.params.week;
  // const url = `https://wol.jw.org/es/wol/meetings/r4/lp-s/2024/${week}`; // es
  const url = `https://wol.jw.org/en/wol/meetings/r1/lp-e/2024/${week}`; // en
  const response = await axios.get(url);
  const html = response.data;
  const $ = load(html);
  // get all elements with the attribute data-pid

  const elements = $('[data-pid]');

  const data = elements
    .map((index, element) => {
      return $(element).text();
    })
    .get();

  // Get all elements that has the class "dc-icon--music"
  const musicElements = $('.dc-icon--music').map((index, element) => {
    // replace if were &nbsp; with a space
    return $(element).text().replace(/\u00a0/g, ' ');
  });

  // Get a filtered list of elements that match the following criteria:
  // 1. The element starts with a number followed by a dot
  // 2. The element is capitalized
  // 3. The element starts with a number in parentheses (in this case extract and return the text in parentheses)
  const filteredNumberedElements = data
    .map((element) => {
      const isNumbered = /^\d+\./.test(element);
      const isCapitalized = element === element.toUpperCase();
      const hasParentheses = /\((\d[^)]+)\)/.exec(element);
      if (isNumbered || isCapitalized || hasParentheses) {
        if (hasParentheses) {
          return hasParentheses[1];
        }
        return element;
      }
    })
    .filter((element) => element);

  const meet: { [key: string]: string } = {
    dateAndLecture: `${filteredNumberedElements[0]} | ${filteredNumberedElements[1]}`,
    firtSong: musicElements[0].toString().split(' ')[1],
    secondSong: musicElements[1].toString().split(' ')[1],
    thirdSong: musicElements[2].toString().split(' ')[1],
  };

  
  let section = 0;
  filteredNumberedElements.forEach((element, index) => {
    console.log('Element: ', element);
    if ( element === element?.toUpperCase() ) {
      if ( index > 1 ) {
        section += 1;
        console.log('Section is:', section, element);
        meet[`section-${section}`] = element as string;
      }
    }
    // if element start with a digit and a dot, example: 1. or 2.
    if ( /^\d+\./.test(element || '') ) {
      const key = `section-${section}-point-${element?.split('.')[0]}`;
      meet[key] = `${element} (${filteredNumberedElements[index + 1]})`;
    }
  },
  );

  console.log('Meet: ', meet);
  res.json(meet);
});

export default router;
