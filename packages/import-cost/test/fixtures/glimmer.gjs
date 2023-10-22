import { func1 } from 'chai';
import Component from '@glimmer/component';

const ComponentA = <template>Lorem ipsum 1</template>;

function ComponentB() {
  return <template>Lorem ipsum 2</template>;
}

export default class ComponentC extends Component {
  x = 1;

  <template>
    {{this.x}}

    <ComponentA />
  </template>
}
