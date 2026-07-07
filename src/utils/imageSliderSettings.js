function capSlides(imageCount, maxVisible) {
  const count = Math.max(0, Number(imageCount) || 0);
  if (count === 0) return 1;
  return Math.min(count, maxVisible);
}

export function buildImageSliderSettings(imageCount = 0) {
  const count = Math.max(0, Number(imageCount) || 0);
  const slidesToShow = capSlides(count, 1);

  return {
    dots: count > 1,
    arrows: false,
    infinite: count > slidesToShow,
    speed: 500,
    slidesToShow,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow,
          slidesToScroll: 1,
          infinite: count > slidesToShow,
          arrows: false,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow,
          slidesToScroll: 1,
          infinite: count > slidesToShow,
          arrows: false,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow,
          slidesToScroll: 1,
          infinite: count > slidesToShow,
          arrows: false,
        },
      },
    ],
  };
}

export function buildReviewSliderSettings(slideCount = 0) {
  const count = Math.max(0, Number(slideCount) || 0);

  return {
    dots: count > 1,
    infinite: count > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: count > 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: count > 1,
          arrows: count > 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: count > 1,
          arrows: count > 1,
        },
      },
    ],
  };
}
