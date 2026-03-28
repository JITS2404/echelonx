import { EconomicNode, EconomicEdge } from './types';

export class EconomicGraph {
  private nodes: Map<string, EconomicNode>;
  private edges: EconomicEdge[];
  private adjacencyList: Map<string, EconomicEdge[]>;

  constructor(nodes: EconomicNode[], edges: EconomicEdge[]) {
    this.nodes = new Map(nodes.map(n => [n.id, { ...n }]));
    this.edges = edges;
    this.adjacencyList = new Map();
    this.buildAdjacencyList();
  }

  private buildAdjacencyList() {
    this.nodes.forEach((_, id) => this.adjacencyList.set(id, []));
    this.edges.forEach(edge => {
      const list = this.adjacencyList.get(edge.from_node) || [];
      list.push(edge);
      this.adjacencyList.set(edge.from_node, list);
    });
  }

  getNode(id: string): EconomicNode | undefined {
    return this.nodes.get(id);
  }

  updateNodeValue(id: string, value: number) {
    const node = this.nodes.get(id);
    if (node) {
      node.current_value = value;
    }
  }

  getIncomingEdges(nodeId: string): EconomicEdge[] {
    return this.edges.filter(e => e.to_node === nodeId);
  }

  getOutgoingEdges(nodeId: string): EconomicEdge[] {
    return this.adjacencyList.get(nodeId) || [];
  }

  getAllNodes(): EconomicNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): EconomicEdge[] {
    return this.edges;
  }

  clone(): EconomicGraph {
    return new EconomicGraph(this.getAllNodes(), this.getAllEdges());
  }

  reset() {
    this.nodes.forEach(node => {
      node.current_value = node.baseline_value;
    });
  }
}
