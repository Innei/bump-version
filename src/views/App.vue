<template>
  <TBox>
    <TText color="#5a5">Which version would you like to bump it?</TText>
  </TBox>
  <TBox>
    <TText>Current Version: </TText>
    <TText color="#41daaa">{{ currentVersion }}</TText>

    <TText v-if="updatedVersion"> -> {{ updatedVersion }} </TText>
  </TBox>
  <TBox>
    <TSelectInput
      :items="selectItem"
      @select="handleSubmit"
      @highlight="handleSelectVersion"
    >
    </TSelectInput>
  </TBox>
</template>

<script lang="ts" setup>
import { TBox, TText } from '@temir/core'
import TSelectInput from '@temir/select-input'
import { ref } from 'vue'
import { generateReleaseTypes, getPackageJson } from '../utils/pkg.js'
import { run } from '../utils/run.js'

const packageJson = getPackageJson()
const currentVersion = packageJson.json.version

if (!currentVersion) {
  console.error(`Not a valid package.json file, can't find version.`)
  process.exit(-1)
}
const versions = generateReleaseTypes(currentVersion)

const selectItem = versions.map((version) => ({
  label: version.name,
  value: version.value,
}))

const updatedVersion = ref()
const handleSelectVersion = (item) => {
  updatedVersion.value = item?.value
}
const handleSubmit = (item) => {
  handleSelectVersion(item)

  run(item.value)
}
</script>
