// @ts-nocheck
/*******
 * @description 全屏工具util
 *  <RScaleScreen height={1080} width={1920} bodyOverflowHidden={false} fullScreen isScale={S_C}>
 *   内容
 *  </RScaleScreen>
 * @author @licai
 * @constant 1981824361@qq.com
 */
import { useDebounceFn, useDeepCompareEffect } from "ahooks";
import type { CSSProperties, ReactNode } from "react";
import { memo, useEffect, useRef, useState } from "react";
import emitter from "../utils/events.js";

function nextTick(fn: () => void) {
  return Promise.resolve().then(fn);
}

/**
 * 防抖函数
 * @param {Function} fn
 * @param {number} delay
 * @returns {() => void}
 */
// eslint-disable-next-line @typescript-eslint/ban-types
function debounce(fn: Function, delay: number): () => void {
  let timer: number;
  return function (...args: any[]): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(
      () => {
        // eslint-disable-next-line prefer-spread
        typeof fn === "function" && fn.apply(null, args);
        clearTimeout(timer);
      },
      delay > 0 ? delay : 100
    );
  };
}

type IAutoScale =
  | boolean
  | {
      x?: boolean;
      y?: boolean;
    };

interface Options {
  children?: ReactNode;
  autoScale?: IAutoScale;
  fullScreen?: boolean;
  width?: number | string;
  height?: number | string;
  bodyOverflowHidden?: boolean;
  delay?: number;
  boxStyle?: CSSProperties;
  wrapperStyle?: CSSProperties;
  isScale?: boolean;
  show?: boolean;
}

function RScaleScreen(props: Options) {
  const {
    width = 1920,
    height = 1080,
    autoScale = true,
    bodyOverflowHidden = false,
    delay = 500,
    isScale = false,
    fullScreen = true,
    show,
  } = props;
  if (!isScale) {
    return <>{props.children}</>;
  }
  let bodyOverflow: string;
  const elRef = useRef<HTMLDivElement>(null);
  const [otherWidth, setOtherWidth] = useState(0);
  const [size, setSize] = useState({
    width,
    height,
    originalHeight: 0,
    originalWidth: 0,
  });

  const styles: Record<"box" | "wrapper", CSSProperties> = {
    box: {
      overflow: "hidden",
      backgroundSize: `100% 100%`,
      backgroundColor: `#000`,
      width: `100%`,
      height: `100vh`,
    },
    wrapper: {
      transitionProperty: `all`,
      transitionTimingFunction: `cubic-bezier(0.4, 0, 0.2, 1)`,
      transitionDuration: `500ms`,
      position: `relative`,
      overflow: `hidden`,
      zIndex: 100,
      transformOrigin: `left top`,
    },
  };

  let observer: MutationObserver;

  function initBodyStyle() {
    bodyOverflow = document.body.style.overflow;
    document.body.style = "overflow-x: auto;overflow-y: clip;";
  }

  function initSize() {
    return new Promise<void>((resolve) => {
      nextTick(() => {
        setSize({
          ...size,
          originalWidth: window.screen.width,
          originalHeight: window.screen.height,
        });
        resolve();
      });
    });
  }
  function updateSize() {
    if (size.width && size.height) {
      elRef.current!.style.width = `calc(${size.width}px - ${otherWidth}px)`;
      elRef.current!.style.height = `${size.height}px`;
    } else {
      elRef.current!.style.width = `${size.originalWidth}px`;
      elRef.current!.style.height = `${size.originalHeight}px`;
    }
  }

  function handleAutoScale(scale: number) {
    if (!autoScale) return;
    const domWidth = elRef.current!.clientWidth;
    const domHeight = elRef.current!.clientHeight;
    const currentWidth = document.body.clientWidth;
    const currentHeight = document.body.clientHeight;
    elRef.current!.style.transform = `scale(${scale},${scale})`;
    let mx = Math.max((currentWidth - domWidth * scale) / 2, 0);
    let my = Math.max((currentHeight - domHeight * scale) / 2, 0);
    if (typeof props.autoScale === "object") {
      !props.autoScale.x && (mx = 0);
      !props.autoScale.y && (my = 0);
    }
    elRef.current!.style.margin = `${my}px ${mx}px`;
  }
  function updateScale() {
    // 获取真实视口尺寸
    const currentWidth = document.body.clientWidth - otherWidth;
    const currentHeight = document.body.clientHeight;
    // 获取大屏最终的宽高
    const realWidth = (size.width || size.originalWidth) - otherWidth;
    const realHeight = size.height || size.originalHeight;
    // 计算缩放比例
    const widthScale = currentWidth / +realWidth;
    const heightScale = currentHeight / +realHeight;
    // 若要铺满全屏，则按照各自比例缩放
    if (fullScreen) {
      const ele = document.querySelectorAll('[data-id-sc="sc"]');
      ele.forEach((item) => {
        if (heightScale === 1 || widthScale === 1) {
          item.style.transform = `scale(${heightScale},${widthScale})`;
        } else {
          item.style.transform = `scale(${heightScale + 0.2},${
            widthScale + 0.2
          })`;
        }
      });
      elRef.current!.style.transform = `scale(${widthScale},${heightScale})`;
      return false;
    }
    // 按照宽高最小比例进行缩放
    const scale = Math.min(widthScale, heightScale);
    handleAutoScale(scale);
  }
  const onResize = debounce(async () => {
    if (!elRef.current) return;
    await initSize();
    updateSize();
    updateScale();
  }, delay);

  function initMutationObserver() {
    observer = new MutationObserver(() => {
      onResize();
    });

    observer.observe(elRef.current!, {
      attributes: true,
      attributeFilter: ["style"],
      attributeOldValue: true,
    });
  }

  async function initState() {
    initBodyStyle();
    initMutationObserver();
    await initSize();
    updateSize();
    updateScale();
    window.addEventListener("resize", onResize);
  }

  const setWidth = () => {
    const w = document.querySelector('aside[class~="ant-layout-sider"]')?.style
      ?.width;
    const width = Number(w?.split("px")?.[0] || 0);
    width && setOtherWidth(width);
  };

  const { run } = useDebounceFn(
    () => {
      setWidth();
    },
    {
      wait: 500,
    }
  );

  const onFullscreenchange = () => {
    if (document.fullscreenElement) {
      setOtherWidth(0);
    } else {
      run();
    }
  };

  const _onHandleResize = (collapsed: boolean) => {
    if (collapsed) {
      setOtherWidth(48);
    } else {
      setOtherWidth(208);
    }
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      run();
    });
    const ele = document.querySelector('aside[class~="ant-layout-sider"]');
    // 监听元素
    ele && resizeObserver.observe(ele);
    document.addEventListener("fullscreenchange", onFullscreenchange);
    emitter.addListener("onChangeMnue", _onHandleResize);
    return () => {
      emitter.removeListener("onChangeMnue", _onHandleResize);
    };
  }, []);

  useDeepCompareEffect(() => {
    initState();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      if (bodyOverflowHidden) {
        document.body.style.overflow = bodyOverflow;
      }
    };
  }, [otherWidth, show]);

  /* useEffect(() => {
    initBodyStyle();
  }, [bodyOverflowHidden]); */

  return (
    <div
      style={{ ...styles.box, ...props.boxStyle }}
      className={"react-screen-box"}
    >
      <div
        className={"screen-wrapper"}
        style={{ ...styles.wrapper, ...props.wrapperStyle }}
        ref={elRef}
      >
        {props.children}
      </div>
    </div>
  );
}
export default memo(RScaleScreen);
