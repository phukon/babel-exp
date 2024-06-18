import React from 'react';
const ExampleComponent = () => {
  const trackEvent = (eventName, eventAttributes) => {
    mixpanel.track(eventName, eventAttributes);
  };
  const handleClick = () => {
    const eventName = 'Button Clicked';
    const eventAttributes = {
      buttonColor: 'red',
      buttonSize: 'large'
    };
    trackEvent(eventName, eventAttributes);
  };
  return <div>
      <Lol onClick={handleClick}>
        Click Me
      </Lol>
    </div>;
};
export default ExampleComponent;