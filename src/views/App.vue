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
      @select="handleSelectVersion"
      @highlight="handleSelectVersion"
    >
    </TSelectInput>
  </TBox>
</template>

<script lang="ts" setup>
import { TText, TBox, TNewline } from '@temir/core'
import TSelectInput from '@temir/select-input'
import { ref } from 'vue'
import { generateReleaseTypes, getPackageJson } from '../utils'

const packageJson = getPackageJson()
const currentVersion = packageJson.json.version
const versions = generateReleaseTypes(currentVersion)

const selectItem = versions.map((version) => ({
  label: version.name,
  value: version.value,
}))

const updatedVersion = ref()
const handleSelectVersion = (item) => {
  // @see https://github.com/webfansplz/temir/pull/7
  updatedVersion.value = item?.value
}
</script>
