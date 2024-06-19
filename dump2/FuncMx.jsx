import React from 'react';
import Lol from '../dump/lol';
import IterateWrapper from "../src/IterateWrapper";
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
      <Lol onClick={handleClick}>Click Me</Lol>
      <div onClick={handleClick}>Click Me</div>
    </div>;
};
export default ExampleComponent;