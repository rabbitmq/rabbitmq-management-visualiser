# RabbitMQ Visualiser

This experimental plugin that visualizes RabbitMQ topology and message flow.
It is **DEPRECATED** and will not ship with RabbitMQ as of 3.7.0.


## Project Maturity

This project was an experiment because it is no longer under development.

## Usage

This is a plugin for the RabbitMQ Management Plugin that provides an
HTML Canvas for rendering configured broker topology. The current main
purpose of this is for diagnostics and comprehension of the current
routing topology of the broker.

The left of the canvas displays exchanges, the right displays queues,
and the top displays channels. All of these items can be dragged
around the canvas. They repel one another, and snap back into their
predefined areas should they be released within the boundaries of those
areas.

Shift-clicking on an item hides it - it will be added to the relevant
select box on the left.

Hovering over an item shows at the top of the screen various details
about the item. Double-clicking on the item will take you to the
specific page in the Management Plugin concerning that item.

When hovering over an item, incoming links and/or traffic are shown in
green, whilst outgoing links and/or traffic are shown in
blue. Bindings are always displayed, but the consumers of a queue, and
likewise the publishers to an exchange, are only drawn in when
hovering over the exchange, queue or channel in question.

By default, up to 10 exchanges, 10 queues and 10 channels are
displayed. Additional resources are available from the left hand-side
select boxes, and can be brought into the display by selecting them
and clicking on the relevant 'Show' button.

The 'Display' check-boxes turn off and on entire resource classes, and
resets positioning.
