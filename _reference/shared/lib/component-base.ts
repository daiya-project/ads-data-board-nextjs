/**
 * 컴포넌트 생명주기 관리 시스템
 */

import { devLog } from './utils';

interface ListenerInfo {
  element: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
}

export type ComponentState = 'created' | 'mounted' | 'updating' | 'destroyed';

export abstract class Component {
  protected container: HTMLElement;
  protected readonly name: string;
  protected listeners: ListenerInfo[] = [];
  protected state: ComponentState = 'created';
  protected children: Component[] = [];
  protected cleanupCallbacks: Array<() => void> = [];

  constructor(container: HTMLElement, name: string) {
    this.container = container;
    this.name = name;
    devLog(`[${this.name}] 컴포넌트 생성됨`);
  }

  abstract render(): Promise<void>;

  async mount(): Promise<void> {
    if (this.state === 'destroyed') return;
    try {
      await this.render();
      this.state = 'mounted';
      devLog(`[${this.name}] 컴포넌트 마운트됨`);
    } catch (error) {
      devLog(`[${this.name}] 마운트 실패:`, error);
      throw error;
    }
  }

  async update(): Promise<void> {
    if (this.state === 'destroyed') return;
    this.state = 'updating';
    try {
      this.removeAllListeners();
      await this.render();
      this.state = 'mounted';
      devLog(`[${this.name}] 컴포넌트 업데이트됨`);
    } catch (error) {
      devLog(`[${this.name}] 업데이트 실패:`, error);
      throw error;
    }
  }

  destroy(): void {
    if (this.state === 'destroyed') return;
    devLog(`[${this.name}] 컴포넌트 파괴 시작...`);
    for (const child of this.children) child.destroy();
    this.children = [];
    this.removeAllListeners();
    for (const callback of this.cleanupCallbacks) {
      try { callback(); } catch (error) { devLog(`[${this.name}] Cleanup 콜백 에러:`, error); }
    }
    this.cleanupCallbacks = [];
    this.container.innerHTML = '';
    this.state = 'destroyed';
    devLog(`[${this.name}] 컴포넌트 파괴 완료`);
  }

  protected addListener<K extends keyof HTMLElementEventMap>(element: HTMLElement, type: K, handler: (event: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void;
  protected addListener(element: EventTarget, type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  protected addListener(element: EventTarget, type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    element.addEventListener(type, handler, options);
    this.listeners.push({ element, type, handler, options });
  }

  protected removeListener(element: EventTarget, type: string, handler: EventListenerOrEventListenerObject): void {
    const index = this.listeners.findIndex(l => l.element === element && l.type === type && l.handler === handler);
    if (index !== -1) {
      const listener = this.listeners[index];
      listener.element.removeEventListener(listener.type, listener.handler, listener.options);
      this.listeners.splice(index, 1);
    }
  }

  protected removeAllListeners(): void {
    for (const listener of this.listeners) {
      listener.element.removeEventListener(listener.type, listener.handler, listener.options);
    }
    this.listeners = [];
    devLog(`[${this.name}] 모든 리스너 제거됨`);
  }

  protected addChild(child: Component): void {
    this.children.push(child);
  }

  protected removeChild(child: Component): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      child.destroy();
      this.children.splice(index, 1);
    }
  }

  protected onCleanup(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  getState(): ComponentState {
    return this.state;
  }

  isMounted(): boolean {
    return this.state === 'mounted';
  }

  isDestroyed(): boolean {
    return this.state === 'destroyed';
  }
}

export interface ListenerManager {
  add<K extends keyof HTMLElementEventMap>(element: HTMLElement, type: K, handler: (event: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void;
  add(element: EventTarget, type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  remove(element: EventTarget, type: string, handler: EventListenerOrEventListenerObject): void;
  removeAll(): void;
  count(): number;
}

export function createListenerManager(name: string): ListenerManager {
  const listeners: ListenerInfo[] = [];
  return {
    add(element: EventTarget, type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
      element.addEventListener(type, handler, options);
      listeners.push({ element, type, handler, options });
    },
    remove(element: EventTarget, type: string, handler: EventListenerOrEventListenerObject): void {
      const index = listeners.findIndex(l => l.element === element && l.type === type && l.handler === handler);
      if (index !== -1) {
        const listener = listeners[index];
        listener.element.removeEventListener(listener.type, listener.handler, listener.options);
        listeners.splice(index, 1);
      }
    },
    removeAll(): void {
      for (const listener of listeners) listener.element.removeEventListener(listener.type, listener.handler, listener.options);
      listeners.length = 0;
      devLog(`[${name}] 모든 리스너 제거됨 (ListenerManager)`);
    },
    count(): number {
      return listeners.length;
    }
  };
}

class ComponentRegistry {
  private components: Map<string, Component> = new Map();

  register(id: string, component: Component): void {
    const existing = this.components.get(id);
    if (existing) existing.destroy();
    this.components.set(id, component);
    devLog(`[ComponentRegistry] 등록: ${id}`);
  }

  get(id: string): Component | undefined {
    return this.components.get(id);
  }

  unregister(id: string): void {
    const component = this.components.get(id);
    if (component) {
      component.destroy();
      this.components.delete(id);
      devLog(`[ComponentRegistry] 해제: ${id}`);
    }
  }

  destroyAll(): void {
    for (const [id, component] of this.components) {
      component.destroy();
      devLog(`[ComponentRegistry] 파괴: ${id}`);
    }
    this.components.clear();
  }

  list(): string[] {
    return Array.from(this.components.keys());
  }
}

export const componentRegistry = new ComponentRegistry();
