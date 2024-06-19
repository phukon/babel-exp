import React from 'react';
const IterateLol = IterateWrapper(Lol, {
  dataiterate:
    'eyJldmVudHMiOltbeyJuYW1lIjoiQnV0dG9uIENsaWNrZWQiLCJhdHRyaWJ1dGVzIjp7ImJ1dHRvbkNvbG9yIjoicmVkIiwiYnV0dG9uU2l6ZSI6ImxhcmdlIn19XV0sImZpbGVQYXRoIjoiZHVtcDJcXEZ1bmNNeC5qc3gifQ==',
});
const ExampleComponent = () => {
  const trackEvent = (eventName, eventAttributes) => {
    mixpanel.track(eventName, eventAttributes);
  };
  const handleClick = () => {
    const eventName = 'Button Clicked';
    const eventAttributes = {
      buttonColor: 'red',
      buttonSize: 'large',
    };
    trackEvent(eventName, eventAttributes);
  };
  return (
    <div>
      <IterateLol onClick={handleClick}>Click Me</IterateLol>
    </div>
  );
};
export default ExampleComponent;
