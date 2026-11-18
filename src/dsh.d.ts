/** 宿主包的类型声明（运行时零 import）。见 resources 目录下 README 的说明。 */

declare module '@deepseek-ai/cordis' {
  export interface SkillRegistrationLike {
    name: string
    description: string
    content: string
    whenToUse?: string
    resourceBase?: { kind: 'directory'; path: string } | { kind: 'url'; url: string } | { kind: 'opaque'; description: string }
    source?: string
  }

  export interface Context {
    skills?: {
      register(skill: SkillRegistrationLike): () => void
    }
    get(name: string): any
    inject?(names: string[], callback: (scoped: Context) => void): unknown
    on?(event: 'dispose', listener: () => void): unknown
    effect?(fn: () => (() => void) | void): unknown
    logger?: {
      warn?(message: string): void
      info?(message: string): void
    }
  }
}
