import React from 'react';

const StarRating = ({ averageRating, type }) => {
  const maxStars = 5;
  const stars = [];

  for (let i = 1; i <= maxStars; i++) {
    let fillColor = '#E0E0E0'; // Default: empty star (gray)
    
    if (averageRating >= i) {
      fillColor = '#FFC107'; // Fully filled star (yellow)
    } else if (averageRating >= i - 1 && averageRating < i) {
      // Partially filled star (use a gradient or percentage-based fill)
      const percentage = (averageRating - (i - 1)) * 100;
      fillColor = `url(#partialGradient${i})`;
    }

    stars.push(
      <li key={i} >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          {/* Gradient for partial fill */}
          {averageRating >= i - 1 && averageRating < i && (
            <defs>
              <linearGradient id={`partialGradient${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#FFC107', stopOpacity: 1 }} />
                <stop
                  offset={`${(averageRating - (i - 1)) * 100}%`}
                  style={{ stopColor: '#FFC107', stopOpacity: 1 }}
                />
                <stop
                  offset={`${(averageRating - (i - 1)) * 100}%`}
                  style={{ stopColor: '#E0E0E0', stopOpacity: 1 }}
                />
                <stop offset="100%" style={{ stopColor: '#E0E0E0', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          )}
          <path
            d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
            fill={fillColor}
          />
        </svg>
      </li>
    );
  }

  return (
    <div className="rating-stars">
      <ul>{stars}</ul>
      {type !== "noreview" && <p>({averageRating} reviews)</p>}
    </div>
  );
}

export default StarRating;