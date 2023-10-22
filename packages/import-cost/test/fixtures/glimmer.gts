import { func1 } from 'chai';
import Component from '@glimmer/component';
import { TOC } from '@ember/component/template-only';

const ComponentA: TOC<{ Args: {} }> = <template>Lorem ipsum 1</template>;

function ComponentB(): any {
  return <template>Lorem ipsum 2</template>;
}

export default class ComponentC extends Component<{ Args: {} }> {
  x: number = 1;

  <template>
    {{this.x}}

    <ComponentA />
  </template>
}
