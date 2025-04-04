import "react-calendar-timeline/lib/Timeline.css";

import React, { useState, useEffect, useRef } from "react";
import moment from "moment";
import Timeline, {
  TimelineMarkers,
  TodayMarker,
  CustomMarker,
  CursorMarker,
} from "react-calendar-timeline";
import generateFakeData from "./generate-fake-data";
import interact from "interactjs";
import { coordinateToTimeRatio } from "react-calendar-timeline/lib/lib/utility/calendar";
import {
  getSumOffset,
  getSumScroll,
} from "react-calendar-timeline/lib/lib/utility/dom-helpers";

const keys = {
  groupIdKey: "id",
  groupTitleKey: "title",
  groupRightTitleKey: "rightTitle",
  itemIdKey: "id",
  itemTitleKey: "title",
  itemDivTitleKey: "title",
  itemGroupKey: "group",
  itemTimeStartKey: "start",
  itemTimeEndKey: "end",
};

const Draggable = ({
  handleItemDrop,
  timelineRef,
  scrollRef,
  children,
  data,
}) => {
  const itemRef = useRef(null);
  // eslint-disable-next-line
  const handleDrop = (e) => {
    const {
      canvasTimeStart,
      visibleTimeStart,
      visibleTimeEnd,
      groupTops,
      width,
    } = timelineRef.current.state;

    const canvasWidth = width * 3;
    const zoom = visibleTimeEnd - visibleTimeStart;
    const canvasTimeEnd = zoom * 3 + canvasTimeStart;
    const ratio = coordinateToTimeRatio(
      canvasTimeStart,
      canvasTimeEnd,
      canvasWidth
    );
    const { offsetLeft, offsetTop } = getSumOffset(scrollRef.current);
    const { scrollLeft, scrollTop } = getSumScroll(scrollRef.current);
    const { pageX, pageY } = e;

    const x = pageX - offsetLeft + scrollLeft;
    const y = pageY - offsetTop + scrollTop;

    const start = x * ratio + canvasTimeStart;

    let groupKey = "";
    for (const key of Object.keys(groupTops)) {
      const groupTop = groupTops[key];
      if (y > groupTop) {
        groupKey = key;
      } else {
        break;
      }
    }
    if (groupKey === "" || pageX < offsetLeft || pageX > offsetLeft + width) {
      return;
    }

    handleItemDrop({ data, start, groupKey });
  };

  useEffect(() => {
    let x, y;
    const interactable = interact(itemRef.current)
      .draggable({ enabled: true })
      .on("dragstart", (e) => {
        ({ pageX: x, pageY: y } = e);
      })
      .on("dragmove", (e) => {
        const { pageX, pageY } = e;
        e.target.style.transform = `translate(${pageX - x}px, ${pageY - y}px)`;
      })
      .on("dragend", (e) => {
        e.target.style.transform = "";
        handleDrop(e);
      });

    return () => {
      interactable.unset();
    };
  }, [handleDrop]);

  return <div ref={itemRef}>{children}</div>;
};

const App = () => {
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [defaultTimeStart] = useState(moment().startOf("day").toDate());
  const [defaultTimeEnd] = useState(
    moment().startOf("day").add(1, "day").toDate()
  );

  useEffect(() => {
    const { groups, items } = generateFakeData();
    setGroups(groups);
    setItems(items);
  }, []);

  const handleCanvasClick = (groupId, time) => {
    console.log("Canvas clicked", groupId, moment(time).format());
  };

  const handleCanvasDoubleClick = (groupId, time) => {
    console.log("Canvas double clicked", groupId, moment(time).format());
  };

  const handleCanvasContextMenu = (group, time) => {
    console.log("Canvas context menu", group, moment(time).format());
  };

  const handleItemClick = (itemId, _, time) => {
    console.log("Clicked: " + itemId, moment(time).format());
  };

  const handleItemSelect = (itemId, _, time) => {
    console.log("Selected: " + itemId, moment(time).format());
  };

  const handleItemDoubleClick = (itemId, _, time) => {
    console.log("Double Click: " + itemId, moment(time).format());
  };

  const handleItemContextMenu = (itemId, _, time) => {
    console.log("Context Menu: " + itemId, moment(time).format());
  };

  const handleItemMove = (itemId, dragTime, newGroupOrder) => {
    const group = groups[newGroupOrder];
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              start: dragTime,
              end: dragTime + (item.end - item.start),
              group: group.id,
            }
          : item
      )
    );
    console.log("Moved", itemId, dragTime, newGroupOrder);
  };

  const handleItemResize = (itemId, time, edge) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              start: edge === "left" ? time : item.start,
              end: edge === "left" ? item.end : time,
            }
          : item
      )
    );
    console.log("Resized", itemId, time, edge);
  };

  const handleTimeChange = (
    visibleTimeStart,
    visibleTimeEnd,
    updateScrollCanvas
  ) => {
    const minTime = moment().add(-6, "months").valueOf();
    const maxTime = moment().add(6, "months").valueOf();

    if (visibleTimeStart < minTime && visibleTimeEnd > maxTime) {
      updateScrollCanvas(minTime, maxTime);
    } else if (visibleTimeStart < minTime) {
      updateScrollCanvas(
        minTime,
        minTime + (visibleTimeEnd - visibleTimeStart)
      );
    } else if (visibleTimeEnd > maxTime) {
      updateScrollCanvas(
        maxTime - (visibleTimeEnd - visibleTimeStart),
        maxTime
      );
    } else {
      updateScrollCanvas(visibleTimeStart, visibleTimeEnd);
    }
  };

  const moveResizeValidator = (action, item, time) => {
    if (time < new Date().getTime()) {
      const newTime =
        Math.ceil(new Date().getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
      return newTime;
    }
    return time;
  };

  const handleItemDrop = ({ data: { title }, start, groupKey }) => {
    const end = start + 1000 * 60 * 60 * 24;

    const startDay = moment(start).day();
    const endDay = moment(end).day();

    setItems((prevItems) => [
      ...prevItems,
      {
        id: prevItems.length,
        start,
        end,
        group: parseInt(groupKey, 10) + 1,
        title,
        className:
          startDay === 6 || startDay === 0 || endDay === 6 || endDay === 0
            ? "item-weekend"
            : "",
        itemProps: {
          "data-tip": "Drag & drop is working",
        },
      },
    ]);
  };

  const scrollObj = useRef({ current: null });

  const onScrollRef = (ref) => {
    scrollObj.current = ref;
  };

  const timelineRef = useRef(null);

  return (
    <div style={{ padding: "30px" }}>
      <Draggable
        handleItemDrop={handleItemDrop}
        timelineRef={timelineRef}
        scrollRef={scrollObj}
        data={{ title: "Drag & drop works" }}
      >
        <div
          style={{
            width: "250px",
            height: "50px",
            background: "lightgray",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Drag & drop me onto the timeline
        </div>
      </Draggable>
      <Timeline
        ref={timelineRef}
        scrollRef={onScrollRef}
        groups={groups}
        items={items}
        keys={keys}
        sidebarWidth={150}
        sidebarContent={<div>Above The Left</div>}
        itemsSorted
        canMove
        canResize="right"
        canSelect
        showCursorLine
        itemTouchSendsClick={false}
        stackItems
        itemHeightRatio={0.75}
        defaultTimeStart={defaultTimeStart}
        defaultTimeEnd={defaultTimeEnd}
        onCanvasClick={handleCanvasClick}
        onCanvasDoubleClick={handleCanvasDoubleClick}
        onCanvasContextMenu={handleCanvasContextMenu}
        onItemClick={handleItemClick}
        onItemSelect={handleItemSelect}
        onItemContextMenu={handleItemContextMenu}
        onItemDoubleClick={handleItemDoubleClick}
        onItemMove={handleItemMove}
        onItemResize={handleItemResize}
        onTimeChange={handleTimeChange}
        moveResizeValidator={moveResizeValidator}
      >
        <TimelineMarkers>
          <TodayMarker />
          <CustomMarker
            date={moment().startOf("day").valueOf() + 1000 * 60 * 60 * 2}
          />
          <CustomMarker date={moment().add(3, "day").valueOf()}>
            {({ styles }) => {
              const newStyles = { ...styles, backgroundColor: "blue" };
              return <div style={newStyles} />;
            }}
          </CustomMarker>
          <CursorMarker />
        </TimelineMarkers>
      </Timeline>
    </div>
  );
};

export default App;
