import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export interface KmeshConfigSpec {
  port?: number;
  logLevel?: string;
  enableMetrics?: boolean;
}

export interface KmeshConfigInterface extends KubeObjectInterface {
  spec: KmeshConfigSpec;
}

/**
 * Headlamp resource class for KmeshConfig CRD.
 * Allows type-safe CRUD operations, list hooks, and getters inside the React UI.
 */
export class KmeshConfigClass extends KubeObject<KmeshConfigInterface> {
  static apiVersion = ['kmesh.net/v1'];
  static kind = 'KmeshConfig';
  static apiName = 'kmeshconfigs';
  static isNamespaced = true;

  get spec(): KmeshConfigSpec {
    return this.jsonData.spec || {};
  }

  get port(): number {
    return this.spec.port ?? 15006;
  }

  get logLevel(): string {
    return this.spec.logLevel ?? 'info';
  }

  get enableMetrics(): boolean {
    return this.spec.enableMetrics ?? false;
  }
}
